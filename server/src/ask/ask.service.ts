import { Injectable } from '@nestjs/common';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectorIndexService } from '../redis/vector-index.service';
import { LlmService } from '../ai/llm.service';
import { SessionService } from '../session/session.service';
import { AskResponse, AskStreamEvent, Source } from '../types';

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

const NO_DOCS_ANSWER =
  'I cannot find any relevant information in the docs. Please upload documentation first.';

function isConversationalMessage(text: string) {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[!?.…]+$/g, '');

  const exactMatches = new Set([
    'hi',
    'hey',
    'hello',
    'yo',
    'sup',
    'howdy',
    'thanks',
    'thank you',
    'thx',
    'ty',
    'help',
    'who are you',
    'what can you do',
    'good morning',
    'good afternoon',
    'good evening',
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

function buildConversationalPrompt(conversationHistory: string, question: string): string {
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

function buildRagPrompt(conversationHistory: string, context: string, question: string): string {
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
    if (!question || question.trim() === '') {
      throw new Error('Question is required');
    }

    const conversationHistory = await this.loadConversationHistory(sessionId);

    if (isConversationalMessage(question)) {
      const answer = await this.llmService.complete(
        buildConversationalPrompt(conversationHistory, question),
      );

      await this.persistTurn(sessionId, question, answer);

      return { answer, sources: [] };
    }

    const questionEmbedding = await this.embeddingsService.embedQuery(question);

    const cachedResponse = await this.vectorIndexService.searchCache(questionEmbedding, 0.95);
    if (cachedResponse) {
      await this.persistTurn(sessionId, question, cachedResponse.answer);

      return {
        answer: cachedResponse.answer,
        sources: [],
      };
    }

    const relevantChunks = await this.vectorIndexService.searchSimilar(questionEmbedding, 5);

    if (relevantChunks.length === 0) {
      await this.persistTurn(sessionId, question, NO_DOCS_ANSWER);
      return {
        answer: NO_DOCS_ANSWER,
        sources: [],
      };
    }

    const context = relevantChunks
      .map((chunk) => `[${chunk.fileName}#${chunk.section}]\n${chunk.content}`)
      .join('\n\n---\n\n');

    const prompt = buildRagPrompt(conversationHistory, context, question);
    const answer = await this.llmService.complete(prompt);

    await this.persistTurn(sessionId, question, answer);
    await this.vectorIndexService.storeCache(question, answer, questionEmbedding);

    const sources: Source[] = relevantChunks.map((chunk) => ({
      fileName: chunk.fileName,
      section: chunk.section,
      score: chunk.score,
    }));
    return { answer, sources };
  }

  /**
   * Same RAG pipeline as ask(), but yields SSE-friendly events as tokens arrive.
   * Session + semantic cache are updated only after the full answer is known.
   */
  async *askStream(question: string, sessionId?: string): AsyncGenerator<AskStreamEvent> {
    if (!question || question.trim() === '') {
      yield { type: 'error', message: 'Question is required' };
      return;
    }

    try {
      const conversationHistory = await this.loadConversationHistory(sessionId);

      if (isConversationalMessage(question)) {
        yield { type: 'sources', sources: [] };
        const answer = yield* this.streamLlmAnswer(
          buildConversationalPrompt(conversationHistory, question),
        );
        await this.persistTurn(sessionId, question, answer);
        yield { type: 'done' };
        return;
      }

      const questionEmbedding = await this.embeddingsService.embedQuery(question);

      const cachedResponse = await this.vectorIndexService.searchCache(questionEmbedding, 0.95);
      if (cachedResponse) {
        yield { type: 'sources', sources: [] };
        yield { type: 'token', value: cachedResponse.answer };
        await this.persistTurn(sessionId, question, cachedResponse.answer);
        yield { type: 'done' };
        return;
      }

      const relevantChunks = await this.vectorIndexService.searchSimilar(questionEmbedding, 5);

      if (relevantChunks.length === 0) {
        yield { type: 'sources', sources: [] };
        yield { type: 'token', value: NO_DOCS_ANSWER };
        await this.persistTurn(sessionId, question, NO_DOCS_ANSWER);
        yield { type: 'done' };
        return;
      }

      const sources: Source[] = relevantChunks.map((chunk) => ({
        fileName: chunk.fileName,
        section: chunk.section,
        score: chunk.score,
      }));
      yield { type: 'sources', sources };

      const context = relevantChunks
        .map((chunk) => `[${chunk.fileName}#${chunk.section}]\n${chunk.content}`)
        .join('\n\n---\n\n');

      const prompt = buildRagPrompt(conversationHistory, context, question);
      const answer = yield* this.streamLlmAnswer(prompt);

      await this.persistTurn(sessionId, question, answer);
      await this.vectorIndexService.storeCache(question, answer, questionEmbedding);
      yield { type: 'done' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate answer';
      yield { type: 'error', message };
    }
  }

  private async *streamLlmAnswer(prompt: string): AsyncGenerator<AskStreamEvent, string> {
    let answer = '';
    for await (const token of this.llmService.completeStream(prompt)) {
      answer += token;
      yield { type: 'token', value: token };
    }
    return answer;
  }

  private async persistTurn(sessionId: string | undefined, question: string, answer: string) {
    if (!sessionId) return;
    await this.sessionService.addMessage(sessionId, 'user', question);
    await this.sessionService.addMessage(sessionId, 'assistant', answer);
  }

  private async loadConversationHistory(sessionId?: string): Promise<string> {
    if (!sessionId) {
      return '';
    }

    const history = await this.sessionService.getHistory(sessionId);
    if (history.length === 0) {
      return '';
    }

    return history
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
  }
}
