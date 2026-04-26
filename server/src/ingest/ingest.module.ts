import { Module } from '@nestjs/common';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { ChunkerService } from './chunker.service';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [EmbeddingsModule, RedisModule],
  controllers: [IngestController],
  providers: [IngestService, ChunkerService],
  exports: [IngestService],
})
export class IngestModule {}
