import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configurarApp } from '../src/configurar-app.js';
import type { RespostaAuth } from '../src/auth/auth.service.js';

export async function criarApp(): Promise<INestApplication> {
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = modulo.createNestApplication();
  configurarApp(app);
  await app.init();
  return app;
}

export const SENHA_TESTE = 'senha-segura-1';

export async function cadastrar(app: INestApplication): Promise<RespostaAuth> {
  const resposta = await request(app.getHttpServer())
    .post('/auth/cadastro')
    .send({ nome: 'Teste', email: `teste-${randomUUID()}@exemplo.com`, senha: SENHA_TESTE })
    .expect(201);
  return resposta.body as RespostaAuth;
}
