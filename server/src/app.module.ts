import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { AiModule } from './ai/ai.module';
import { IngestModule } from './ingest/ingest.module';
import { AskModule } from './ask/ask.module';
import { DocumentsModule } from './documents/documents.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,
    EmbeddingsModule,
    AiModule,
    IngestModule,
    AskModule,
    DocumentsModule,
  ],
})
export class AppModule {}
