import { Controller, Get, Delete, Param } from '@nestjs/common';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Get()
  async list() {
    return this.documentsService.listDocuments();
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.documentsService.deleteDocument(id);
  }
}
