import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IngestService } from './ingest.service';
import { IngestResponse } from '../types';

@Controller('ingest')
export class IngestController {
  constructor(private ingestService: IngestService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  async ingest(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<IngestResponse> {
    return this.ingestService.ingestFiles(files);
  }
}
