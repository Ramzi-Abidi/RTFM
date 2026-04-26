import { Injectable } from '@nestjs/common';

export interface Chunk {
  content: string;
  section: string;
  chunkIndex: number;
}

@Injectable()
export class ChunkerService {
  private maxChunkSize = 500;
  private overlap = 50;

  chunk(content: string, fileName: string): Chunk[] {
    const sections = this.splitBySections(content);
    const chunks: Chunk[] = [];
    let chunkIndex = 0;

    for (const section of sections) {
      const sectionChunks = this.splitSection(section.content, section.title);
      for (const chunk of sectionChunks) {
        chunks.push({
          content: chunk,
          section: section.title,
          chunkIndex: chunkIndex++,
        });
      }
    }

    return chunks;
  }

  private splitBySections(content: string): { title: string; content: string }[] {
    const lines = content.split('\n');
    const sections: { title: string; content: string }[] = [];
    let currentSection = { title: 'Introduction', content: '' };

    for (const line of lines) {
      const headerMatch = line.match(/^#{1,3}\s+(.+)$/);
      if (headerMatch) {
        if (currentSection.content.trim()) {
          sections.push(currentSection);
        }
        currentSection = { title: headerMatch[1], content: '' };
      } else {
        currentSection.content += line + '\n';
      }
    }

    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }

    return sections;
  }

  private splitSection(content: string, section: string): string[] {
    const words = content.split(/\s+/);
    const chunks: string[] = [];

    if (words.length <= this.maxChunkSize) {
      if (content.trim()) {
        chunks.push(content.trim());
      }
      return chunks;
    }

    let start = 0;
    while (start < words.length) {
      const end = Math.min(start + this.maxChunkSize, words.length);
      const chunk = words.slice(start, end).join(' ');
      if (chunk.trim()) {
        chunks.push(chunk.trim());
      }
      start = end - this.overlap;
      if (start >= words.length - this.overlap) break;
    }

    return chunks;
  }
}
