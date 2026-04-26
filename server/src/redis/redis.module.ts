import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { VectorIndexService } from './vector-index.service';

@Module({
  providers: [RedisService, VectorIndexService],
  exports: [RedisService, VectorIndexService],
})
export class RedisModule {}
