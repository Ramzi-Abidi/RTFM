import { Controller, Post, Body } from '@nestjs/common';
import { AskService } from './ask.service';
import { AskRequest, AskResponse } from '../types';

@Controller('ask')
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post()
  async ask(@Body() body: AskRequest): Promise<AskResponse> {
    return this.askService.ask(body.question, body.sessionId);
  }
}
