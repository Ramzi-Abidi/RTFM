import { Controller, Get, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { SessionService, SessionMetadata, SessionMessage } from './session.service';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /**
   * Lists all sessions with metadata
   */
  @Get()
  async list(): Promise<{ sessions: SessionMetadata[] }> {
    const sessions = await this.sessionService.listSessions();
    return { sessions };
  }

  /**
   * Loads full conversation history for a specific session
   */
  @Get(':id')
  async load(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<{ messages: SessionMessage[] }> {
    const messages = await this.sessionService.loadSession(id);
    return { messages };
  }

  /**
   * Deletes a session and all its messages
   */
  @Delete(':id')
  async delete(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.sessionService.clearSession(id);
    return { success: true };
  }
}
