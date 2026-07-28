import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from './redis.service';
import { DocumentChunk } from '../types';
import { SchemaFieldTypes, VectorAlgorithms } from 'redis';
import { createHash } from 'crypto';

const EMBEDDING_DIM = 1024;
const DOC_INDEX = 'idx:docs';
const CACHE_INDEX = 'idx:cache';

interface SimilarChunk {
  id: string;
  content: string;
  fileName: string;
  section: string;
  score: number;
}

interface CachedAnswer {
  question: string;
  answer: string;
  score: number;
}

@Injectable()
export class VectorIndexService implements OnModuleInit {
  constructor(private redisService: RedisService) {}

  async onModuleInit() {
    await this.createIndexes();
  }

  private async createIndexes() {
    const client = this.redisService.getClient();

    try {
      await client.ft.create(
        DOC_INDEX,
        {
          content: { type: SchemaFieldTypes.TEXT },
          embedding: {
            type: SchemaFieldTypes.VECTOR,
            ALGORITHM: VectorAlgorithms.FLAT,
            TYPE: 'FLOAT32',
            DIM: EMBEDDING_DIM,
            DISTANCE_METRIC: 'COSINE',
          },
          fileName: { type: SchemaFieldTypes.TAG },
          section: { type: SchemaFieldTypes.TAG },
          chunkIndex: { type: SchemaFieldTypes.NUMERIC },
        },
        { ON: 'HASH', PREFIX: 'doc:' },
      );
      console.log('Created docs vector index');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes('Index already exists')) {
        console.log('Docs index already exists');
      } else {
        console.error('Error creating docs index:', e);
      }
    }

    try {
      await client.ft.create(
        CACHE_INDEX,
        {
          question: { type: SchemaFieldTypes.TEXT },
          embedding: {
            type: SchemaFieldTypes.VECTOR,
            ALGORITHM: VectorAlgorithms.FLAT,
            TYPE: 'FLOAT32',
            DIM: EMBEDDING_DIM,
            DISTANCE_METRIC: 'COSINE',
          },
          answer: { type: SchemaFieldTypes.TEXT },
        },
        { ON: 'HASH', PREFIX: 'cache:' },
      );
      console.log('Created cache vector index');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes('Index already exists')) {
        console.log('Cache index already exists');
      } else {
        console.error('Error creating cache index:', e);
      }
    }
  }

  /**
   * Stores a document chunk in Redis with its embedding for vector search.
   * @param chunk - The document chunk containing content, embedding, and metadata
   */
  async storeChunk(chunk: DocumentChunk) {
    const key = `doc:${chunk.id}`;
    const embeddingBuffer = Buffer.from(new Float32Array(chunk.embedding).buffer);

    await this.redisService.hSet(key, {
      content: chunk.content,
      embedding: embeddingBuffer,
      fileName: chunk.fileName,
      section: chunk.section,
      chunkIndex: chunk.chunkIndex,
    });
  }

  /**
   * Searches for document chunks most similar to the given embedding using KNN.
   * @param embedding - The query embedding vector (1024 dimensions)
   * @param topK - Number of most similar results to return (default: 5)
   * @returns Array of matching chunks with content, fileName, section, and similarity score
   */
  async searchSimilar(embedding: number[], topK: number = 5): Promise<SimilarChunk[]> {
    const client = this.redisService.getClient();
    const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);

    const results = await client.ft.search(DOC_INDEX, `*=>[KNN ${topK} @embedding $vec AS score]`, {
      PARAMS: { vec: embeddingBuffer },
      RETURN: ['content', 'fileName', 'section', 'score'],
      SORTBY: { BY: 'score' },
      DIALECT: 2,
    });

    return results.documents.map((doc) => ({
      id: doc.id,
      content: String(doc.value.content ?? ''),
      fileName: String(doc.value.fileName ?? ''),
      section: String(doc.value.section ?? ''),
      score: parseFloat(String(doc.value.score ?? '0')),
    }));
  }

  /**
   * Searches the semantic cache for a previously answered similar question.
   * @param embedding - The query embedding vector of numbers (example: [0.1, 0.2, 0.3, ...])
   * @param threshold - Minimum similarity score to consider a cache hit (default: 0.95)
   * @returns Cached question/answer if similarity >= threshold, null otherwise
   */
  async searchCache(embedding: number[], threshold: number = 0.95): Promise<CachedAnswer | null> {
    const client = this.redisService.getClient();
    const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);

    const results = await client.ft.search(CACHE_INDEX, `*=>[KNN 1 @embedding $vec AS score]`, {
      PARAMS: { vec: embeddingBuffer },
      RETURN: ['question', 'answer', 'score'],
      DIALECT: 2,
    });

    if (results.documents.length > 0) {
      const doc = results.documents[0];
      const score = 1 - parseFloat(String(doc.value.score ?? '0'));
      if (score >= threshold) {
        return {
          question: String(doc.value.question ?? ''),
          answer: String(doc.value.answer ?? ''),
          score,
        };
      }
    }

    return null;
  }

  /**
   * Stores a question-answer pair in the semantic cache for future retrieval.
   * @param question - The original question text
   * @param answer - The generated answer
   * @param embedding - The question's embedding vector for similarity matching
   */
  async storeCache(question: string, answer: string, embedding: number[]) {
    const id = createHash('sha1').update(question).digest('hex').slice(0, 16);
    const key = `cache:${id}`;
    const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);

    await this.redisService.hSet(key, {
      question,
      answer,
      embedding: embeddingBuffer,
    });
  }

  /**
   * Removes every entry from the semantic cache.
   * Called whenever the underlying document corpus changes (ingest/delete)
   * so cached answers can never reference chunks that no longer exist.
   * @returns Number of cache entries removed
   */
  async clearCache(): Promise<number> {
    const keys = await this.redisService.scanKeys('cache:*');
    if (keys.length === 0) return 0;
    await Promise.all(keys.map((k) => this.redisService.del(k)));
    return keys.length;
  }

  /**
   * Deletes all chunks associated with a document from Redis.
   * @param fileId - The hash ID of the document
   * @returns Number of chunks deleted
   */
  async deleteDocChunks(fileId: string) {
    const keys = await this.redisService.scanKeys(`doc:${fileId}:*`);
    let deleted = 0;
    for (const key of keys) {
      await this.redisService.del(key);
      deleted++;
    }
    return deleted;
  }

  async getDocumentChunks(_fileName: string) {
    return this.redisService.scanKeys(`doc:*`);
  }
}
