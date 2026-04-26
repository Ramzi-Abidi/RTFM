import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingsService {
  private apiKey: string;
  private baseUrl = 'https://api.jina.ai/v1/embeddings';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('JINA_API_KEY') || '';
  }

  /**
   * Generates embeddings for multiple text passages using Jina AI.
   * Uses 'retrieval.passage' task optimized for document chunks.
   * @param texts - Array of text strings to embed
   * @returns Array of embedding vectors (1024 dimensions each)
   * @throws Error if Jina API call fails
   */
  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'jina-embeddings-v3',
        task: 'retrieval.passage',
        input: texts,
      }),
    });

    if (!response.ok) {
      throw new Error(`Jina API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((d: { embedding: number[] }) => d.embedding);
  }

  /**
   * Generates an embedding for a single query using Jina AI.
   * Uses 'retrieval.query' task optimized for search queries.
   * @param text - The query text to embed
   * @returns Single embedding vector (1024 dimensions)
   * @throws Error if Jina API call fails
   */
  async embedQuery(text: string): Promise<number[]> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'jina-embeddings-v3',
        task: 'retrieval.query',
        input: [text],
      }),
    });
    console.log("response",response);
    if (!response.ok) {
      throw new Error(`Jina API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }
}
