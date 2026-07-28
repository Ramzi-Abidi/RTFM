import { Controller, Get, Delete, Param } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { ParseFileIdPipe } from '../common/pipes/parse-file-id.pipe';

@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Get()
  async list() {
    return this.documentsService.listDocuments();
  }

  @Get(':id')
  async get(@Param('id', ParseFileIdPipe) id: string) {
    return this.documentsService.getDocument(id);
  }

  @Delete(':id')
  async delete(@Param('id', ParseFileIdPipe) id: string) {
    return this.documentsService.deleteDocument(id);
  }
}
