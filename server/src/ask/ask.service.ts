import { Injectable } from "@nestjs/common";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import { VectorIndexService } from "../redis/vector-index.service";
import { LlmService } from "../ai/llm.service";
import { SessionService } from "../session/session.service";
import { AskResponse, Source } from "../types";

const SYSTEM_PROMPT = `You are a documentation assistant.
Answer factual questions using ONLY the provided documentation and conversation history.
If the answer is not supported by the documentation, say clearly that you could not find it in the uploaded docs and suggest rephrasing or uploading more documentation.
Always cite sources using [Source: filename#section] format when using doc content.
Be detailed, thorough, and helpful.`;

const CONVERSATIONAL_PROMPT = `You are RTFM, a friendly documentation assistant.

The user is greeting you or making casual conversation — not asking a documentation question yet.

Respond naturally, warmly, and briefly. You may use light personality.
Invite them to ask questions about their uploaded documentation.
If they have not uploaded docs yet, mention they can upload .md or .txt files to get started.

Do NOT say "I cannot find this information in the docs" for greetings or small talk.
Do NOT invent documentation content.`;

function isConversationalMessage(text: string) {
  const normalized = text.trim().toLowerCase().replace(/[!?.…]+$/g, "");

  const exactMatches = new Set([
    "hi",
    "hey",
    "hello",
    "yo",
    "sup",
    "howdy",
    "thanks",
    "thank you",
    "thx",
    "ty",
    "help",
    "who are you",
    "what can you do",
    "good morning",
    "good afternoon",
    "good evening",
  ]);

  if (exactMatches.has(normalized)) {
    return true;
  }

  if (
    /^(hi|hey|hello|thanks|thank you)\b/.test(normalized) &&
    normalized.split(/\s+/).length <= 4
  ) {
    return true;
  }

  return false;
}

function buildConversationalPrompt(
  conversationHistory: string,
  question: string,
): string {
  let prompt = CONVERSATIONAL_PROMPT;

  if (conversationHistory) {
    prompt += `

Conversation so far:
${conversationHistory}`;
  }

  prompt += `

User: ${question}

Answer:`;
  return prompt;
}

@Injectable()
export class AskService {
  constructor(
    private readonly embeddingsService: EmbeddingsService,
    private readonly vectorIndexService: VectorIndexService,
    private readonly llmService: LlmService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * Processes a user question using RAG (Retrieval Augmented Generation).
   * 1. Loads conversation history from session (if sessionId provided)
   * 2. Checks semantic cache for similar previously answered questions
   * 3. Embeds the question and searches for relevant document chunks
   * 4. Builds a prompt with history + context and sends to LLM
   * 5. Saves messages to session and caches the response
   * @param question - The user's question about the documentation
   * @param sessionId - Optional session ID for conversation memory
   * @returns Object containing the answer and source references
   * @throws Error if question is empty
   */
  async ask(question: string, sessionId?: string): Promise<AskResponse> {
    if (!question || question.trim() === "") {
      throw new Error("Question is required");
    }

    const conversationHistory = await this.loadConversationHistory(sessionId);

    if (isConversationalMessage(question)) {
      const answer = await this.llmService.complete(
        buildConversationalPrompt(conversationHistory, question),
      );

      if (sessionId) {
        await this.sessionService.addMessage(sessionId, "user", question);
        await this.sessionService.addMessage(sessionId, "assistant", answer);
      }

      return { answer, sources: [] };
    }

    const questionEmbedding = await this.embeddingsService.embedQuery(question);

    // handles the semantic caching for avoiding redundant AI calls
    const cachedResponse = await this.vectorIndexService.searchCache(
      questionEmbedding,
      0.95,
    );
    if (cachedResponse) {
      // Still save to session even if cached
      if (sessionId) {
        await this.sessionService.addMessage(sessionId, "user", question);
        await this.sessionService.addMessage(
          sessionId,
          "assistant",
          cachedResponse.answer,
        );
      }

      return {
        answer: cachedResponse.answer,
        sources: [],
      };
    }

    // Retrieve relevant chunks, find the 5 most similar document chunks
    const relevantChunks = await this.vectorIndexService.searchSimilar(
      questionEmbedding,
      5,
    );

    if (relevantChunks.length === 0) {
      const noDocsAnswer =
        "I cannot find any relevant information in the docs. Please upload documentation first.";
      if (sessionId) {
        await this.sessionService.addMessage(sessionId, "user", question);
        await this.sessionService.addMessage(
          sessionId,
          "assistant",
          noDocsAnswer,
        );
      }
      return {
        answer: noDocsAnswer,
        sources: [],
      };
    }

    const context = relevantChunks
      .map(
        (chunk) => `[${chunk.fileName}#${chunk.section}]
${chunk.content}`,
      )
      .join(`

---

`);

    // Build prompt with conversation history if available
    let prompt = SYSTEM_PROMPT;

    if (conversationHistory) {
      prompt += `

Conversation so far:
${conversationHistory}`;
    }

    prompt += `

Documentation:
${context}

Question: ${question}

Answer:`;

    // LLM call, build prompt with chunks + conversation history → answer
    const answer = await this.llmService.complete(prompt);

    // Save to session
    if (sessionId) {
      await this.sessionService.addMessage(sessionId, "user", question);
      await this.sessionService.addMessage(sessionId, "assistant", answer);
    }

    // cache the result for the next time.
    await this.vectorIndexService.storeCache(
      question,
      answer,
      questionEmbedding,
    );

    const sources: Source[] = relevantChunks.map((chunk) => ({
      fileName: chunk.fileName,
      section: chunk.section,
      score: chunk.score,
    }));
    return { answer, sources };
  }

  private async loadConversationHistory(sessionId?: string): Promise<string> {
    if (!sessionId) {
      return "";
    }

    const history = await this.sessionService.getHistory(sessionId);
    if (history.length === 0) {
      return "";
    }

    return history
      .map(
        (msg) =>
          `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`,
      )
      .join(`
`);
  }
}
