import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { UsuarioId } from '../auth/usuario-id.decorator.js';
import { AtualizarLancamentoDto, CriarLancamentoDto, MesQueryDto } from './lancamentos.dto.js';
import { LancamentosService } from './lancamentos.service.js';

@Controller('lancamentos')
export class LancamentosController {
  constructor(private readonly lancamentos: LancamentosService) {}

  @Get()
  listar(@UsuarioId() usuarioId: string, @Query() { mes }: MesQueryDto) {
    return this.lancamentos.listar(usuarioId, mes);
  }

  @Get(':id')
  buscar(@UsuarioId() usuarioId: string, @Param('id') id: string) {
    return this.lancamentos.buscar(usuarioId, id);
  }

  @Post()
  criar(@UsuarioId() usuarioId: string, @Body() dto: CriarLancamentoDto) {
    return this.lancamentos.criar(usuarioId, dto);
  }

  @Patch(':id')
  atualizar(@UsuarioId() usuarioId: string, @Param('id') id: string, @Body() dto: AtualizarLancamentoDto) {
    return this.lancamentos.atualizar(usuarioId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remover(@UsuarioId() usuarioId: string, @Param('id') id: string) {
    return this.lancamentos.remover(usuarioId, id);
  }
}
