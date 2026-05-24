import { Injectable } from '@nestjs/common';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectorIndexService } from '../redis/vector-index.service';
import { LlmService } from '../ai/llm.service';
import { SessionService } from '../session/session.service';
import { AskResponse, Source } from '../types';

const SYSTEM_PROMPT = `You are a documentation assistant.
Answer ONLY using the provided documentation and conversation history.
If the answer is not in the documentation, say: "I cannot find this information in the docs."
Always cite sources using [Source: filename#section] format.
Be detailed, thorough, and helpful.`;

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

    // Load conversation history if session exists
    let conversationHistory = '';
    if (sessionId) {
      const history = await this.sessionService.getHistory(sessionId);
      if (history.length > 0) {
        conversationHistory = history
          .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n');
      }
    }

    const questionEmbedding = await this.embeddingsService.embedQuery(question);

    const cachedResponse = await this.vectorIndexService.searchCache(
      questionEmbedding,
      0.95,
    );
    if (cachedResponse) {
      // Still save to session even if cached
      if (sessionId) {
        await this.sessionService.addMessage(sessionId, 'user', question);
        await this.sessionService.addMessage(sessionId, 'assistant', cachedResponse.answer);
      }

      return {
        answer: cachedResponse.answer,
        sources: [],
      };
    }

    const relevantChunks = await this.vectorIndexService.searchSimilar(
      questionEmbedding,
      5,
    );

    if (relevantChunks.length === 0) {
      const noDocsAnswer = 'I cannot find any relevant information in the docs. Please upload documentation first.';
      if (sessionId) {
        await this.sessionService.addMessage(sessionId, 'user', question);
        await this.sessionService.addMessage(sessionId, 'assistant', noDocsAnswer);
      }
      return {
        answer: noDocsAnswer,
        sources: [],
      };
    }

    const context = relevantChunks
      .map((chunk) => `[${chunk.fileName}#${chunk.section}]\n${chunk.content}`)
      .join('\n\n---\n\n');

    // Build prompt with conversation history if available
    let prompt = SYSTEM_PROMPT;
    
    if (conversationHistory) {
      prompt += `\n\nConversation so far:\n${conversationHistory}`;
    }
    
    prompt += `\n\nDocumentation:\n${context}\n\nQuestion: ${question}\n\nAnswer:`;
    const answer = await this.llmService.complete(prompt);

    // Save to session
    if (sessionId) {
      await this.sessionService.addMessage(sessionId, 'user', question);
      await this.sessionService.addMessage(sessionId, 'assistant', answer);
    }

    await this.vectorIndexService.storeCache(question, answer, questionEmbedding);

    const sources: Source[] = relevantChunks.map((chunk) => ({
      fileName: chunk.fileName,
      section: chunk.section,
      score: chunk.score,
    }));
    return { answer, sources };
  }
}
