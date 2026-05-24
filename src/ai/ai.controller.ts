import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatbotDto } from './dto/chatbot.dto';
import { GenerateDescriptionDto } from './dto/generate-description.dto';
import { AnalyzeReviewDto } from './dto/analyze-review.dto';

@Controller('ai')
@ApiTags('AI')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chatbot')
  @ApiOperation({ summary: 'Answer a property-rental chatbot prompt' })
  chatbot(@Body() dto: ChatbotDto) {
    return this.aiService.chatbot(dto);
  }

  @Post('generate-description')
  @ApiOperation({ summary: 'Generate a property listing description' })
  generateDescription(@Body() dto: GenerateDescriptionDto) {
    return this.aiService.generateDescription(dto);
  }

  @Post('analyze-review')
  @ApiOperation({ summary: 'Analyze review sentiment and key points' })
  analyzeReview(@Body() dto: AnalyzeReviewDto) {
    return this.aiService.analyzeReview(dto);
  }
}
