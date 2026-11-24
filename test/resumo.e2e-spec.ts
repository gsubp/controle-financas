import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cadastrar, criarApp } from './util.js';

describe('resumo (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const criar = (token: string, corpo: object) =>
    http().post('/lancamentos').set('Authorization', `Bearer ${token}`).send(corpo).expect(201);

  beforeAll(async () => {
    app = await criarApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('resume só os lançamentos do usuário logado', async () => {
    const a = (await cadastrar(app)).token;
    const b = (await cadastrar(app)).token;
    const base = { descricao: 'x', data: '2026-11-10' };
    await criar(a, { ...base, tipo: 'RECEITA', categoria: 'Salário', valorCentavos: 100000 });
    await criar(a, { ...base, tipo: 'DESPESA', categoria: 'Moradia', valorCentavos: 30000 });
    await criar(a, { ...base, tipo: 'DESPESA', categoria: 'Moradia', valorCentavos: 20000, data: '2026-10-10' });
    await criar(b, { ...base, tipo: 'RECEITA', categoria: 'Salário', valorCentavos: 999900 });

    const res = await http().get('/resumo?mes=2026-11').set('Authorization', `Bearer ${a}`).expect(200);
    expect(res.body).toMatchObject({
      receitasCentavos: 100000,
      despesasCentavos: 30000,
      saldoCentavos: 70000,
      quantidade: 2,
      variacao: { despesas: 50 },
      porCategoria: [{ categoria: 'Moradia', totalCentavos: 30000, percentual: 100 }],
    });
  });

  it('valida o mês e exige token', async () => {
    const { token } = await cadastrar(app);
    await http().get('/resumo?mes=abc').set('Authorization', `Bearer ${token}`).expect(400);
    await http().get('/resumo?mes=2026-11').expect(401);
  });
});
