import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { LancamentosModule } from './lancamentos/lancamentos.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ResumoModule } from './resumo/resumo.module.js';

@Module({ imports: [PrismaModule, AuthModule, LancamentosModule, ResumoModule] })
export class AppModule {}
