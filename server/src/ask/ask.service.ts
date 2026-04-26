import { Injectable } from '@nestjs/common';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectorIndexService } from '../redis/vector-index.service';
import { LlmService } from '../ai/llm.service';
import { AskResponse, Source } from '../types';

const SYSTEM_PROMPT = `You are a documentation assistant.
Answer ONLY using the provided documentation.
If the answer is not in the documentation, say: "I cannot find this information in the docs."
Always cite sources using [Source: filename#section] format.
Be concise and helpful.`;

@Injectable()
export class AskService {
  constructor(
    private readonly embeddingsService: EmbeddingsService,
    private readonly vectorIndexService: VectorIndexService,
    private readonly llmService: LlmService,
  ) {}

  /**
   * Processes a user question using RAG (Retrieval Augmented Generation).
   * 1. Checks semantic cache for similar previously answered questions
   * 2. Embeds the question and searches for relevant document chunks
   * 3. Builds a prompt with retrieved context and sends to LLM
   * 4. Caches the response for future similar questions
   * @param question - The user's question about the documentation
   * @returns Object containing the answer and source references
   * @throws Error if question is empty
   */
  async ask(question: string): Promise<AskResponse> {
    console.log("ask from service is called");
    if (!question || question.trim() === '') {
      throw new Error('Question is required');
    }

    const questionEmbedding = await this.embeddingsService.embedQuery(question);
    console.log("questionEmbedding", questionEmbedding);
    const cachedResponse = await this.vectorIndexService.searchCache(
      questionEmbedding,
      0.95,
    );

    if (cachedResponse) {
      return {
        answer: cachedResponse.answer,
        sources: [],
      };
    }

    const relevantChunks = await this.vectorIndexService.searchSimilar(
      questionEmbedding,
      5,
    );
    console.log("relevantChunks", relevantChunks);

    if (relevantChunks.length === 0) {
      return {
        answer: 'I cannot find any relevant information in the docs. Please upload documentation first.',
        sources: [],
      };
    }

    const context = relevantChunks
      .map((chunk) => `[${chunk.fileName}#${chunk.section}]\n${chunk.content}`)
      .join('\n\n---\n\n');

    const prompt = `${SYSTEM_PROMPT}

Documentation:
${context}

Question: ${question}

Answer:`;

    const answer = await this.llmService.complete(prompt);

    await this.vectorIndexService.storeCache(question, answer, questionEmbedding);

    const sources: Source[] = relevantChunks.map((chunk) => ({
      fileName: chunk.fileName,
      section: chunk.section,
      score: chunk.score,
    }));
    console.log("sources", sources, answer);
    return { answer, sources };
  }
}
