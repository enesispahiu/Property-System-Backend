import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReviewAnalysisJob } from './review-analysis.job';
import { SearchHistoryCleanupJob } from './search-history-cleanup.job';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, AiModule],
  providers: [SearchHistoryCleanupJob, ReviewAnalysisJob],
})
export class JobsModule {}
