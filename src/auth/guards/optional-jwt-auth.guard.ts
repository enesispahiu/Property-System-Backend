import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtPayload } from '../jwt-payload.type';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = JwtPayload>(
    _err: unknown,
    user: TUser | false | null,
  ): TUser | undefined {
    return user || undefined;
  }
}
