import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type RequisicaoAutenticada = Request & { usuarioId?: string };

export const UsuarioId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => ctx.switchToHttp().getRequest<RequisicaoAutenticada>().usuarioId!,
);
