import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

@Injectable()
export class LlmService {
  private groq: Groq;
  private googleApiKey: string;

  constructor(private configService: ConfigService) {
    this.groq = new Groq({
      apiKey: this.configService.get<string>('GROQ_API_KEY') || '',
    });
    this.googleApiKey = this.configService.get<string>('GOOGLE_AI_API_KEY') || '';
  }

  /**
   * Generates a completion for the given prompt using Groq LLM.
   * Falls back to Google AI (Gemini) if Groq is rate limited.
   * @param prompt - The full prompt including system instructions and context
   * @returns The generated text response
   * @throws Error if both Groq and Google AI fail
   */
  async complete(prompt: string) {
    // We generally let errors propagate from services so the global exception
    // filter can map them to proper HTTP responses. The try/catch here is the
    // exception: it exists only to decide whether to fall back to Google AI.
    try {
      return await this.completeWithGroq(prompt);
    } catch (error) {
      if (this.isRateLimitError(error)) {
        console.log('Groq rate limited, falling back to Google AI');
        return await this.completeWithGoogle(prompt);
      }
      throw error;
    }
  }

  /**
   * Streams a completion token by token from Groq.
   * On rate limit, falls back to a non-streaming Google completion and yields
   * the full answer as a single token so callers can keep one code path.
   */
  async *completeStream(prompt: string): AsyncGenerator<string> {
    try {
      yield* this.completeStreamWithGroq(prompt);
    } catch (error) {
      if (this.isRateLimitError(error)) {
        console.log('Groq rate limited, falling back to Google AI (non-streaming)');
        const answer = await this.completeWithGoogle(prompt);
        if (answer) {
          yield answer;
        }
        return;
      }
      throw error;
    }
  }

  private isRateLimitError(error: unknown) {
    return error instanceof Error && error.message.includes('rate limit');
  }

  private async completeWithGroq(prompt: string) {
    const response = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content || '';
  }

  private async *completeStreamWithGroq(prompt: string): AsyncGenerator<string> {
    const stream = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }

  private async completeWithGoogle(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.googleApiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Google AI error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}
