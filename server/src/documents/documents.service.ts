import { Injectable, NotFoundException } from '@nestjs/common';
import { VectorIndexService } from '../redis/vector-index.service';
import { RedisService } from '../redis/redis.service';

export interface DocumentInfo {
  id: string;
  fileName: string;
  chunks: number;
}

export interface DocumentDetail {
  id: string;
  fileName: string;
  content: string;
  chunks: number;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly vectorIndexService: VectorIndexService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Retrieves all ingested documents from Redis.
   * @returns Object containing array of documents with id, fileName, and chunk count
   */
  async listDocuments(): Promise<{ documents: DocumentInfo[] }> {
    const keys = await this.redisService.scanKeys('file:*');
    const documents: DocumentInfo[] = [];

    for (const key of keys) {
      const data = await this.redisService.hGetAll(key);
      documents.push({
        id: key.replace('file:', ''),
        fileName: data.fileName,
        chunks: parseInt(data.chunks, 10),
      });
    }
    console.log('documents from redis', documents);
    return { documents };
  }

  /**
   * Retrieves a single document with its full text content for preview.
   * @param fileId - The hash ID of the document
   * @returns Document metadata and full content
   * @throws NotFoundException if document or preview content is missing
   */
  async getDocument(fileId: string): Promise<DocumentDetail> {
    const fileKey = `file:${fileId}`;
    const data = await this.redisService.hGetAll(fileKey);

    if (!data.fileName) {
      throw new NotFoundException('Document not found');
    }

    if (!data.content) {
      throw new NotFoundException(
        'Preview not available for this document. Re-upload it to enable preview.',
      );
    }

    return {
      id: fileId,
      fileName: data.fileName,
      content: data.content,
      chunks: parseInt(data.chunks, 10),
    };
  }

  /**
   * Deletes a document and all its associated chunks from Redis.
   * @param fileId - The hash ID of the document to delete
   * @returns Object with success status and deleted fileName
   * @throws Error if document is not found
   */
  async deleteDocument(fileId: string): Promise<{ success: boolean; deleted: string }> {
    const fileKey = `file:${fileId}`;
    const data = await this.redisService.hGetAll(fileKey);

    if (!data.fileName) {
      throw new Error('Document not found');
    }

    await this.vectorIndexService.deleteDocChunks(fileId);
    await this.redisService.del(fileKey);
    // because cached answers may reference a deleted doc.
    await this.vectorIndexService.clearCache();

    return { success: true, deleted: data.fileName };
  }
}
