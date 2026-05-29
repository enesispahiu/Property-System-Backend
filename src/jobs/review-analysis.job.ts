import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewAnalysisJob {
  private readonly logger = new Logger(ReviewAnalysisJob.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingReviews() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const reviews = await this.prisma.review.findMany({
        where: {
          analysis: null,
        },
        select: {
          id: true,
          comment: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 5,
      });

      if (reviews.length === 0) {
        return;
      }

      for (const review of reviews) {
        try {
          const analysis = await this.aiService.analyzeReview({
            comment: review.comment,
          });

          await this.prisma.reviewAnalysis.create({
            data: {
              reviewId: review.id,
              sentiment: analysis.sentiment,
              summary: analysis.summary,
              issue: analysis.issue,
            },
          });

          this.logger.log(`Stored AI analysis for review ${review.id}.`);
        } catch (error) {
          this.logger.warn(
            `Could not analyze review ${review.id}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Review analysis job failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    } finally {
      this.isRunning = false;
    }
  }
}
