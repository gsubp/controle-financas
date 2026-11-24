import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { configurarApp } from '../src/configurar-app.js';

export async function criarApp(): Promise<INestApplication> {
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = modulo.createNestApplication();
  configurarApp(app);
  await app.init();
  return app;
}
