import { Controller, Post, Body, Res, Req } from '@nestjs/common';
import { Request, Response } from 'express';
import { AskService } from './ask.service';
import { AskDto } from './dto/ask.dto';
import { AskResponse } from '../types';

@Controller('ask')
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post()
  async ask(@Body() body: AskDto): Promise<AskResponse> {
    return this.askService.ask(body.question, body.sessionId);
  }

  @Post('stream')
  async stream(@Body() body: AskDto, @Req() req: Request, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let closed = false;
    const onClose = () => {
      closed = true;
    };
    req.on('close', onClose);

    try {
      for await (const event of this.askService.askStream(body.question, body.sessionId)) {
        if (closed) {
          break;
        }
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        if (event.type === 'done' || event.type === 'error') {
          break;
        }
      }
    } catch (error) {
      if (!closed) {
        const message = error instanceof Error ? error.message : 'Stream failed';
        res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
      }
    } finally {
      req.off('close', onClose);
      if (!closed) {
        res.end();
      }
    }
  }
}
