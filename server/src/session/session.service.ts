import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

type Role = 'user' | 'assistant';

export interface SessionMessage {
  role: Role;
  content: string;
}

export interface SessionMetadata {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: string;
}

@Injectable()
export class SessionService {
  private readonly TTL_SECONDS = 24 * 60 * 60; // 24 hours

  constructor(private readonly redisService: RedisService) {}

  async getHistory(sessionId: string, limit = 20): Promise<SessionMessage[]> {
    const key = `session:${sessionId}`;
    const client = this.redisService.getClient();
    
    // Get last N messages (negative indices = from end)
    // limit is max number of recent messages to return (default: 20)

    const messages = await client.lRange(key, -limit, -1);
    return messages.map((m) => JSON.parse(m) as SessionMessage);
  }

  /**
   * Adds a message to the session history and resets TTL.
   * @param sessionId - Unique session identifier
   * @param role - 'user' or 'assistant'
   * @param content - Message content
   */
  async addMessage(sessionId: string, role: Role, content: string) {
    const key = `session:${sessionId}`;
    const client = this.redisService.getClient();
    const message: SessionMessage = { role, content };

    await client.rPush(key, JSON.stringify(message));
    await client.expire(key, this.TTL_SECONDS);
    
    // Store creation timestamp if this is the first message
    const metadataKey = `meta:${sessionId}`;
    const exists = await client.exists(metadataKey);
    if (!exists) {
      await client.hSet(metadataKey, { createdAt: new Date().toISOString() });
      await client.expire(metadataKey, this.TTL_SECONDS);
    }
  }

  /**
   * Lists all sessions with metadata
   * @returns Array of session metadata sorted by creation date (newest first)
   */
  async listSessions(): Promise<SessionMetadata[]> {
    const pattern = 'session:*';
    const client = this.redisService.getClient();
    const keys = await client.keys(pattern);
    
    const sessions = await Promise.all(
      keys.map(async (key) => {
        const sessionId = key.replace('session:', '');
        const messages = await client.lRange(key, 0, -1);
        
        if (messages.length === 0) return null;
        
        const firstMessage = messages[0] ? JSON.parse(messages[0]) : null;
        const lastMessage = messages[messages.length - 1] ? JSON.parse(messages[messages.length - 1]) : null;
        
        // Get creation timestamp from metadata
        const metadataKey = `meta:${sessionId}`;
        const createdAt = await client.hGet(metadataKey, 'createdAt') || new Date().toISOString();
        
        return {
          id: sessionId,
          title: firstMessage?.content?.slice(0, 50) + (firstMessage?.content?.length > 50 ? '...' : '') || 'New Chat',
          lastMessage: lastMessage?.content?.slice(0, 100) + (lastMessage?.content?.length > 100 ? '...' : '') || '',
          messageCount: messages.length,
          createdAt
        };
      })
    );
    
    return sessions
      .filter((session): session is SessionMetadata => session !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Loads full conversation history for a session
   * @param sessionId - Unique session identifier
   * @returns Array of all messages in chronological order
   */
  async loadSession(sessionId: string): Promise<SessionMessage[]> {
    return this.getHistory(sessionId, 1000); // Load all messages
  }

  /**
   * Clears all messages for a session.
   * @param sessionId - Unique session identifier
   */
  async clearSession(sessionId: string) {
    const key = `session:${sessionId}`;
    await this.redisService.del(key);
  }
}
