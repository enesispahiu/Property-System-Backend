import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    res.on('finish', () => {
      this.logger.log(`${req.method} ${req.originalUrl} ${res.statusCode}`);
    });

    next();
  }
}
