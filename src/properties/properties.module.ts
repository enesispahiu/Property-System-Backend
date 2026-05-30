import { Module } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SearchModule } from '../search/search.module';
import { AvailabilityController } from './availability.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, SearchModule, NotificationsModule],
  controllers: [PropertiesController, AvailabilityController],
  providers: [PropertiesService],
})
export class PropertiesModule {}
