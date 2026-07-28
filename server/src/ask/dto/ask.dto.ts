import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class AskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  question!: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;
}
