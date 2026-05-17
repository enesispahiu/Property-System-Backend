import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SearchModule } from './search/search.module';
import { JobsModule } from './jobs/jobs.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [PrismaModule, ReviewsModule, SearchModule, JobsModule, AiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
