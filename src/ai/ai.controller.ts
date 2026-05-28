import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { AnalyzeReviewDto } from './dto/analyze-review.dto';
import { ChatbotDto } from './dto/chatbot.dto';
import { GenerateDescriptionDto } from './dto/generate-description.dto';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check local Ollama availability' })
  health() {
    return this.aiService.health();
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat with the local Ollama assistant' })
  @ApiBody({ type: ChatbotDto })
  chat(@Body() dto: ChatbotDto) {
    return this.aiService.chat(dto);
  }

  @Post('property-description')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a property description with Ollama' })
  @ApiBody({ type: GenerateDescriptionDto })
  propertyDescription(@Body() dto: GenerateDescriptionDto) {
    return this.aiService.propertyDescription(dto);
  }

  @Post('review-analysis')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Analyze a property review with Ollama' })
  @ApiBody({ type: AnalyzeReviewDto })
  reviewAnalysis(@Body() dto: AnalyzeReviewDto) {
    return this.aiService.reviewAnalysis(dto);
  }

  @Post('chatbot')
  @ApiOperation({ summary: 'Legacy alias for POST /ai/chat' })
  @ApiBody({ type: ChatbotDto })
  chatbot(@Body() dto: ChatbotDto) {
    return this.aiService.chat(dto);
  }

  @Post('generate-description')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Legacy alias for POST /ai/property-description',
  })
  @ApiBody({ type: GenerateDescriptionDto })
  generateDescription(@Body() dto: GenerateDescriptionDto) {
    return this.aiService.propertyDescription(dto);
  }

  @Post('analyze-review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Legacy alias for POST /ai/review-analysis' })
  @ApiBody({ type: AnalyzeReviewDto })
  analyzeReview(@Body() dto: AnalyzeReviewDto) {
    return this.aiService.reviewAnalysis(dto);
  }
}
