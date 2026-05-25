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

  async reviewAnalysis(dto: AnalyzeReviewDto) {
    const comment = dto.comment || dto.reviewText;

    if (!comment || comment.trim() === '') {
      throw new BadRequestException('Comment is required');
    }

    const prompt = `
Analyze this property review.

Review:
${comment}

Return:
- sentiment: positive, neutral or negative
- short summary
- main issue if any
`;

    return this.generateText(prompt);
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
