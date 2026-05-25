import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { JwtPayload } from '../../auth/jwt-payload.type';
import { Roles } from '../../auth/roles';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;

    if (user?.role === Roles.SUPER_ADMIN) {
      return true;
    }

    if (!user || typeof user.tenantId !== 'number') {
      throw new ForbiddenException('Tenant information is required');
    }

    return true;
  }
}
