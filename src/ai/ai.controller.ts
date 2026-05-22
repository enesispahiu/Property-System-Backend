import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatbotDto } from './dto/chatbot.dto';
import { GenerateDescriptionDto } from './dto/generate-description.dto';
import { AnalyzeReviewDto } from './dto/analyze-review.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chatbot')
  chatbot(@Body() dto: ChatbotDto) {
    return this.aiService.chatbot(dto);
  }

  @Post('generate-description')
  generateDescription(@Body() dto: GenerateDescriptionDto) {
    return this.aiService.generateDescription(dto);
  }

  @Post('analyze-review')
  analyzeReview(@Body() dto: AnalyzeReviewDto) {
    return this.aiService.analyzeReview(dto);
  }
}
