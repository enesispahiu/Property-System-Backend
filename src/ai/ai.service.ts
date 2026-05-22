import { Injectable, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import { ChatbotDto } from './dto/chatbot.dto';
import { GenerateDescriptionDto } from './dto/generate-description.dto';
import { AnalyzeReviewDto } from './dto/analyze-review.dto';

@Injectable()
export class AiService {
  private client: OpenAI | null = null;
  private readonly model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  private async generateText(prompt: string) {
    if (!this.client) {
      return {
        mock: true,
        message:
          'OpenAI API key is not configured. This is a mock response for development/testing.',
        result: prompt,
      };
    }

    const response = await this.client.responses.create({
      model: this.model,
      input: prompt,
    });

    return {
      mock: false,
      result: response.output_text,
    };
  }

  async chatbot(dto: ChatbotDto) {
    if (!dto.message || dto.message.trim() === '') {
      throw new BadRequestException('Message is required');
    }

    const prompt = `
You are a helpful assistant for a property rental system.
Answer the user's question clearly and briefly.

User question:
${dto.message}
`;

    return this.generateText(prompt);
  }

  async generateDescription(dto: GenerateDescriptionDto) {
    if (!dto.title || !dto.location || !dto.price) {
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

  async analyzeReview(dto: AnalyzeReviewDto) {
    if (!dto.reviewText || dto.reviewText.trim() === '') {
      throw new BadRequestException('Review text is required');
    }

    const prompt = `
Analyze this property review.

Review:
${dto.reviewText}

Return:
- sentiment: positive, neutral or negative
- short summary
- main issue if any
`;

    return this.generateText(prompt);
  }
}
