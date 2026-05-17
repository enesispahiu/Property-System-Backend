import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SearchModule } from './search/search.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [PrismaModule, ReviewsModule, SearchModule, JobsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
