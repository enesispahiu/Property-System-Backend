import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnalyzeReviewDto } from './dto/analyze-review.dto';
import { ChatbotDto } from './dto/chatbot.dto';
import { GenerateDescriptionDto } from './dto/generate-description.dto';

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
};

type OllamaTagsResponse = {
  models?: Array<{ name?: string }>;
};

export type ReviewAnalysisResult = {
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'MIXED' | 'UNKNOWN';
  summary: string;
  issue: string | null;
};

@Injectable()
export class AiService {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(configService: ConfigService) {
    this.baseUrl =
      configService.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';
    this.model = configService.get<string>('OLLAMA_MODEL') || 'llama3.2';
  }

  private async generateText(prompt: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          stream: false,
          options: {
            num_predict: 220,
            temperature: 0.3,
          },
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new InternalServerErrorException(
          `Ollama request failed: ${message || response.statusText}`,
        );
      }

      const data = (await response.json()) as OllamaChatResponse;
      const result = data.message?.content?.trim();

      if (!result) {
        throw new InternalServerErrorException(
          'Ollama returned an empty response.',
        );
      }

      return {
        model: this.model,
        result,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'AI assistant is currently unavailable. Make sure Ollama/backend AI service is running.',
      );
    }
  }

  async health() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });

      if (!response.ok) {
        return {
          status: 'unavailable',
          provider: 'ollama',
          baseUrl: this.baseUrl,
          model: this.model,
          ok: false,
        };
      }

      const data = (await response.json()) as OllamaTagsResponse;

      return {
        status: 'ok',
        provider: 'ollama',
        baseUrl: this.baseUrl,
        model: this.model,
        ok: true,
        models: (data.models ?? []).map((model) => model.name).filter(Boolean),
      };
    } catch {
      return {
        status: 'unavailable',
        provider: 'ollama',
        baseUrl: this.baseUrl,
        model: this.model,
        ok: false,
      };
    }
  }

  async chat(dto: ChatbotDto) {
    if (!dto.message || dto.message.trim() === '') {
      throw new BadRequestException('Message is required');
    }

    const prompt = `
You are a helpful assistant for a property rental system.
Give practical guidance based on the user's request.
If property options are provided in the request, recommend the best matches directly.
Do not ask many follow-up questions. Make reasonable assumptions and ask at most one short follow-up only if essential.
Keep the answer concise, useful, and specific.

User question:
${dto.message}
`;

    return this.generateText(prompt);
  }

  async propertyDescription(dto: GenerateDescriptionDto) {
    if (!dto.title || !dto.location || dto.price === undefined || dto.price === null) {
      throw new BadRequestException('Title, location and price are required');
    }

    const amenities =
      dto.amenities && dto.amenities.length > 0
        ? dto.amenities.join(', ')
        : 'not specified';

    const prompt = `
Generate a professional property description for a rental platform.

Property title: ${dto.title}
Location: ${dto.location}
Price: ${dto.price}
Property type: ${dto.propertyType || 'not specified'}
Amenities: ${amenities}

Return a short, attractive and clear description.
`;

    return this.generateText(prompt);
  }

  private parseReviewAnalysis(rawText: string): ReviewAnalysisResult {
    const text = rawText.trim();
    const normalized = text.toLowerCase();
    const sentimentMatch = normalized.match(
      /sentiment\s*[:\-]\s*(positive|neutral|negative|mixed|unknown)/i,
    );
    const detectedSentiment =
      sentimentMatch?.[1] ??
      (normalized.includes('negative')
        ? 'negative'
        : normalized.includes('mixed')
          ? 'mixed'
          : normalized.includes('neutral')
            ? 'neutral'
            : normalized.includes('positive')
              ? 'positive'
              : 'unknown');

    const summaryMatch = text.match(
      /summary\s*[:\-]\s*([\s\S]*?)(?:\n\s*(?:issue|main issue)\s*[:\-]|$)/i,
    );
    const issueMatch = text.match(/(?:issue|main issue)\s*[:\-]\s*([\s\S]*)/i);
    const summary = (summaryMatch?.[1] || text)
      .replace(/^[-*\s]+/, '')
      .trim()
      .slice(0, 500);
    const issue = (issueMatch?.[1] || '')
      .replace(/^[-*\s]+/, '')
      .trim()
      .slice(0, 500);

    return {
      sentiment: detectedSentiment.toUpperCase() as ReviewAnalysisResult['sentiment'],
      summary: summary || 'AI analysis completed.',
      issue: issue && !/^none|n\/a|no issue/i.test(issue) ? issue : null,
    };
  }

  async reviewAnalysis(dto: AnalyzeReviewDto): Promise<ReviewAnalysisResult> {
    const comment = dto.comment || dto.reviewText;

    if (!comment || comment.trim() === '') {
      throw new BadRequestException('Comment is required');
    }

    const prompt = `
Analyze this property review.

Review:
${comment}

Return exactly this format:
sentiment: POSITIVE, NEUTRAL, NEGATIVE or MIXED
summary: one short sentence
issue: main issue if any, otherwise none
`;

    const response = await this.generateText(prompt);

    return this.parseReviewAnalysis(response.result);
  }

  chatbot(dto: ChatbotDto) {
    return this.chat(dto);
  }

  generateDescription(dto: GenerateDescriptionDto) {
    return this.propertyDescription(dto);
  }

  analyzeReview(dto: AnalyzeReviewDto) {
    return this.reviewAnalysis(dto);
  }
}
