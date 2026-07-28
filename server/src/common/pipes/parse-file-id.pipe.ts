import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * Validates that a route param is a 16-character hex string, matching the
 * format produced by IngestService.hashContent (sha256 truncated to 16 chars).
 * Rejects anything else with 400 before the request reaches the controller.
 */
@Injectable()
export class ParseFileIdPipe implements PipeTransform<string, string> {
  private static readonly FILE_ID_PATTERN = /^[a-f0-9]{16}$/;

  transform(value: string): string {
    if (!ParseFileIdPipe.FILE_ID_PATTERN.test(value)) {
      throw new BadRequestException('Invalid file ID format');
    }
    return value;
  }
}
