import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { ChunkerService } from './chunker.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectorIndexService } from '../redis/vector-index.service';
import { RedisService } from '../redis/redis.service';
import { DocumentChunk, IngestResponse } from '../types';

@Injectable()
export class IngestService {
  constructor(
    private readonly chunkerService: ChunkerService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly vectorIndexService: VectorIndexService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Processes multiple uploaded files for ingestion into the vector store.
   * Each file is chunked, embedded, and stored in Redis for later retrieval.
   * @param files - Array of uploaded files from multipart form data
   * @returns Object containing success status, processed files info, and total chunks created
   * @throws Error if no files are provided
   */
  async ingestFiles(files: Express.Multer.File[]): Promise<IngestResponse> {
    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }

    const results: { fileName: string; chunks: number }[] = [];
    let totalChunks = 0;

    for (const file of files) {
      const content = file.buffer.toString('utf-8');
      const result = await this.ingestFile(file.originalname, content);
      results.push(result);
      totalChunks += result.chunks;
    }

    return {
      success: true,
      files: results,
      totalChunks,
    };
  }

  /**
   * Ingests a single file: chunks the content, generates embeddings via Jina AI,
   * and stores each chunk with its embedding in Redis for vector search.
   * @param fileName - Original name of the file
   * @param content - UTF-8 text content of the file
   * @returns Object with fileName and number of chunks created
   * @throws Error if file was already ingested (duplicate detection via content hash)
   */
  private async ingestFile(
    fileName: string,
    content: string,
  ) {
    const fileHash = this.hashContent(content);
    const fileKey = `file:${fileHash}`;

    const exists = await this.redisService.exists(fileKey);
    if (exists) {
      throw new Error(`File ${fileName} already ingested`);
    }

    // convert file to chunks
    const chunks = this.chunkerService.chunk(content, fileName);

    // call Jina ai to convert the chunks to vector [0.5, 0.6, 0.7, ...]
    const embeddings = await this.embeddingsService.embed(
      chunks.map((c) => c.content),
    );

    console.log("embeddings", embeddings);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkId = `${fileHash}:${i}`;

      const docChunk: DocumentChunk = {
        id: chunkId,
        content: chunk.content,
        embedding: embeddings[i],
        fileName,
        section: chunk.section,
        chunkIndex: chunk.chunkIndex,
      };

      // Saves a DocumentChunk into Redis as a hash entry
      await this.vectorIndexService.storeChunk(docChunk);
    }

    await this.redisService.hSet(fileKey, {
      fileName,
      chunks: chunks.length.toString(),
      createdAt: new Date().toISOString(),
    });

    return { fileName, chunks: chunks.length };
  }

  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex').slice(0, 16);
  }
}
