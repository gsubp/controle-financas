import { PrismaService } from '../src/prisma/prisma.service.js';
import { criarApp } from './util.js';

describe('app (e2e)', () => {
  it('conecta no banco de teste', async () => {
    const app = await criarApp();
    const [linha] = await app
      .get(PrismaService)
      .$queryRaw<{ nome: string }[]>`select current_database() as nome`;
    expect(linha.nome).toBe('controle_financas_test');
    await app.close();
  });
});
