import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';

const ROLE_ALIASES: Record<string, string[]> = {
  ADMIN: ['ADMIN'],
  GERENTE: ['GERENTE', 'VENDEDOR', 'CAJERO', 'FARMACEUTICO', 'BODEGA'],
  VENDEDOR: ['VENDEDOR', 'CAJERO'],
  CAJERO: ['CAJERO', 'VENDEDOR'],
  FARMACEUTICO: ['FARMACEUTICO', 'BODEGA'],
  BODEGA: ['BODEGA', 'FARMACEUTICO'],
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    if (!user || !user.rolNombre) {
      throw new ForbiddenException('No tenés permisos para acceder a este recurso.');
    }

    const userRole = user.rolNombre.toUpperCase();
    const userAllowedAliases = ROLE_ALIASES[userRole] || [userRole];

    const hasPermission = requiredRoles.some((reqRole) => {
      const target = reqRole.toUpperCase();
      return userRole === target || userAllowedAliases.includes(target);
    });

    if (!hasPermission) {
      throw new ForbiddenException('No tenés permisos para acceder a este recurso.');
    }

    return true;
  }
}
