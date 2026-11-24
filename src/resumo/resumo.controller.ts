import { Controller, Get, Query } from '@nestjs/common';
import { UsuarioId } from '../auth/usuario-id.decorator.js';
import { MesQueryDto } from '../lancamentos/lancamentos.dto.js';
import { intervaloDoMes, somarMeses } from '../lancamentos/mes.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { montarResumo, type Resumo } from './montar-resumo.js';

@Controller('resumo')
export class ResumoController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async resumo(@UsuarioId() usuarioId: string, @Query() { mes }: MesQueryDto): Promise<Resumo> {
    // ponytail: agrega em memória; trocar por SQL agregado se o volume por usuário passar de alguns milhares
    const lancamentos = await this.prisma.lancamento.findMany({
      where: {
        usuarioId,
        data: { gte: intervaloDoMes(somarMeses(mes, -5)).inicio, lt: intervaloDoMes(mes).fim },
      },
    });
    return montarResumo(mes, lancamentos);
  }
}
