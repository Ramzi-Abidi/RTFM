import { Module } from '@nestjs/common';
import { AskController } from './ask.controller';
import { AskService } from './ask.service';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { RedisModule } from '../redis/redis.module';
import { AiModule } from '../ai/ai.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [EmbeddingsModule, RedisModule, AiModule, SessionModule],
  controllers: [AskController],
  providers: [AskService],
  exports: [AskService],
})
export class AskModule {}
