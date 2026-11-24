import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Lancamento, TipoLancamento } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CATEGORIAS } from './categorias.js';
import type { AtualizarLancamentoDto, CriarLancamentoDto } from './lancamentos.dto.js';
import { intervaloDoMes, paraData } from './mes.js';

export type LancamentoResposta = {
  id: string;
  tipo: TipoLancamento;
  descricao: string;
  categoria: string;
  valorCentavos: number;
  data: string;
};

export function paraResposta(l: Lancamento): LancamentoResposta {
  return {
    id: l.id,
    tipo: l.tipo,
    descricao: l.descricao,
    categoria: l.categoria,
    valorCentavos: l.valorCentavos,
    data: paraData(l.data),
  };
}

export const ORDEM_LISTA = [{ data: 'desc' }, { criadoEm: 'desc' }] as const;

function validarCategoria(tipo: TipoLancamento, categoria: string): void {
  if (!CATEGORIAS[tipo].includes(categoria)) throw new BadRequestException('Categoria inválida para o tipo');
}

const paraDate = (data: string) => new Date(data + 'T00:00:00Z');

const naoEncontrado = () => new NotFoundException('Lançamento não encontrado');

@Injectable()
export class LancamentosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(usuarioId: string, mes: string): Promise<LancamentoResposta[]> {
    const { inicio, fim } = intervaloDoMes(mes);
    const lista = await this.prisma.lancamento.findMany({
      where: { usuarioId, data: { gte: inicio, lt: fim } },
      orderBy: [...ORDEM_LISTA],
    });
    return lista.map(paraResposta);
  }

  async buscar(usuarioId: string, id: string): Promise<LancamentoResposta> {
    const lancamento = await this.prisma.lancamento.findFirst({ where: { id, usuarioId } });
    if (!lancamento) throw naoEncontrado();
    return paraResposta(lancamento);
  }

  async criar(usuarioId: string, dto: CriarLancamentoDto): Promise<LancamentoResposta> {
    validarCategoria(dto.tipo, dto.categoria);
    const { data, ...campos } = dto;
    return paraResposta(
      await this.prisma.lancamento.create({ data: { ...campos, data: paraDate(data), usuarioId } }),
    );
  }

  async atualizar(usuarioId: string, id: string, dto: AtualizarLancamentoDto): Promise<LancamentoResposta> {
    const atual = await this.prisma.lancamento.findFirst({ where: { id, usuarioId } });
    if (!atual) throw naoEncontrado();
    validarCategoria(dto.tipo ?? atual.tipo, dto.categoria ?? atual.categoria);
    const { data, ...campos } = dto;
    return paraResposta(
      await this.prisma.lancamento.update({
        where: { id, usuarioId },
        data: { ...campos, ...(data !== undefined && { data: paraDate(data) }) },
      }),
    );
  }

  async remover(usuarioId: string, id: string): Promise<void> {
    const { count } = await this.prisma.lancamento.deleteMany({ where: { id, usuarioId } });
    if (count === 0) throw naoEncontrado();
  }
}
