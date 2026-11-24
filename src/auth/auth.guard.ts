import { Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PUBLICO } from './publico.decorator.js';
import type { RequisicaoAutenticada } from './usuario-id.decorator.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(PUBLICO, [ctx.getHandler(), ctx.getClass()])) return true;

    const req = ctx.switchToHttp().getRequest<RequisicaoAutenticada>();
    const [esquema, token] = req.headers.authorization?.split(' ') ?? [];
    if (esquema !== 'Bearer' || !token) throw new UnauthorizedException('Não autenticado');

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      req.usuarioId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('Não autenticado');
    }
  }
}
