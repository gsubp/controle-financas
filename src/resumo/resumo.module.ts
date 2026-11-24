import { Module } from '@nestjs/common';
import { ResumoController } from './resumo.controller.js';

@Module({ controllers: [ResumoController] })
export class ResumoModule {}
