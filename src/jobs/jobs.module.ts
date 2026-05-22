import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { SearchHistoryCleanupJob } from './search-history-cleanup.job';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [SearchHistoryCleanupJob],
})
export class JobsModule {}
