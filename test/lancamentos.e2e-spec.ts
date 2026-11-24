import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cadastrar, criarApp } from './util.js';

const SUPERMERCADO = {
  tipo: 'DESPESA',
  descricao: 'Supermercado',
  categoria: 'Alimentação',
  valorCentavos: 41230,
  data: '2026-11-23',
};

describe('lançamentos (e2e)', () => {
  let app: INestApplication;
  let tokenA: string;
  let tokenB: string;
  let idB: string;
  const http = () => request(app.getHttpServer());
  const comoA = (r: request.Test) => r.set('Authorization', `Bearer ${tokenA}`);
  const comoB = (r: request.Test) => r.set('Authorization', `Bearer ${tokenB}`);
  const criarComoA = async (corpo: object) => (await comoA(http().post('/lancamentos')).send(corpo).expect(201)).body;

  beforeAll(async () => {
    app = await criarApp();
    tokenA = (await cadastrar(app)).token;
    const b = await cadastrar(app);
    tokenB = b.token;
    idB = b.usuario.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria, lista, lê, altera e apaga um lançamento', async () => {
    const criado = await criarComoA(SUPERMERCADO);
    expect(criado).toEqual({ id: expect.any(String), ...SUPERMERCADO });

    const lista = await comoA(http().get('/lancamentos?mes=2026-11')).expect(200);
    expect(lista.body.map((l: { id: string }) => l.id)).toContain(criado.id);

    await comoA(http().get(`/lancamentos/${criado.id}`)).expect(200);

    const alterado = await comoA(http().patch(`/lancamentos/${criado.id}`)).send({ valorCentavos: 50000 }).expect(200);
    expect(alterado.body.valorCentavos).toBe(50000);

    await comoA(http().delete(`/lancamentos/${criado.id}`)).expect(204);
    await comoA(http().get(`/lancamentos/${criado.id}`)).expect(404);
  });

  it('lista do mês mais recente para o mais antigo', async () => {
    const { token } = await cadastrar(app);
    const como = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);
    await como(http().post('/lancamentos')).send({ ...SUPERMERCADO, data: '2026-11-05' }).expect(201);
    await como(http().post('/lancamentos')).send({ ...SUPERMERCADO, data: '2026-11-20' }).expect(201);
    const lista = await como(http().get('/lancamentos?mes=2026-11')).expect(200);
    expect(lista.body.map((l: { data: string }) => l.data)).toEqual(['2026-11-20', '2026-11-05']);
  });

  it('respeita os limites do mês sem deslocar a data', async () => {
    const ultimoDia = await criarComoA({ ...SUPERMERCADO, data: '2026-11-30' });
    const primeiroDia = await criarComoA({ ...SUPERMERCADO, data: '2026-12-01' });
    const novembro = (await comoA(http().get('/lancamentos?mes=2026-11')).expect(200)).body.map(
      (l: { id: string }) => l.id,
    );
    const dezembro = (await comoA(http().get('/lancamentos?mes=2026-12')).expect(200)).body.map(
      (l: { id: string }) => l.id,
    );
    expect(novembro).toContain(ultimoDia.id);
    expect(novembro).not.toContain(primeiroDia.id);
    expect(dezembro).toContain(primeiroDia.id);
  });

  it('não deixa um usuário ler, alterar ou apagar lançamento de outro', async () => {
    const deA = await criarComoA(SUPERMERCADO);
    await comoB(http().get(`/lancamentos/${deA.id}`)).expect(404);
    await comoB(http().patch(`/lancamentos/${deA.id}`)).send({ valorCentavos: 1 }).expect(404);
    await comoB(http().delete(`/lancamentos/${deA.id}`)).expect(404);

    const listaB = await comoB(http().get('/lancamentos?mes=2026-11')).expect(200);
    expect(listaB.body.map((l: { id: string }) => l.id)).not.toContain(deA.id);

    const aindaDeA = await comoA(http().get(`/lancamentos/${deA.id}`)).expect(200);
    expect(aindaDeA.body.valorCentavos).toBe(SUPERMERCADO.valorCentavos);
  });

  it('não deixa o PATCH mover o lançamento para outro usuário', async () => {
    const deA = await criarComoA(SUPERMERCADO);
    await comoA(http().patch(`/lancamentos/${deA.id}`)).send({ usuarioId: idB }).expect(400);
    await comoB(http().get(`/lancamentos/${deA.id}`)).expect(404);
    await comoA(http().get(`/lancamentos/${deA.id}`)).expect(200);
  });

  it('recusa campos nulos no PATCH com 400', async () => {
    const criado = await criarComoA(SUPERMERCADO);
    for (const campo of ['tipo', 'descricao', 'categoria', 'valorCentavos', 'data']) {
      await comoA(http().patch(`/lancamentos/${criado.id}`)).send({ [campo]: null }).expect(400);
    }
  });

  it('valida o corpo e o mês', async () => {
    const usuarioB = (await comoB(http().get('/auth/me')).expect(200)).body;
    const invalidos = [
      { ...SUPERMERCADO, tipo: 'RECEITA', categoria: 'Moradia' },
      { ...SUPERMERCADO, valorCentavos: 0 },
      { ...SUPERMERCADO, valorCentavos: 10.5 },
      { ...SUPERMERCADO, valorCentavos: 2000000001 },
      { ...SUPERMERCADO, data: '2026-02-30' },
      { ...SUPERMERCADO, data: '0026-11-23' },
      { ...SUPERMERCADO, data: '0000-01-01' },
      { ...SUPERMERCADO, usuarioId: usuarioB.id },
    ];
    for (const corpo of invalidos) {
      await comoA(http().post('/lancamentos')).send(corpo).expect(400);
    }
    await comoA(http().get('/lancamentos?mes=0026-11')).expect(400);
    await comoA(http().get('/lancamentos?mes=9999-12')).expect(400);
    await comoA(http().get('/lancamentos?mes=2026-13')).expect(400);
    await comoA(http().get('/lancamentos')).expect(400);
  });

  it('confere a categoria contra o tipo final no PATCH', async () => {
    const aluguel = await criarComoA({ ...SUPERMERCADO, descricao: 'Aluguel', categoria: 'Moradia' });
    await comoA(http().patch(`/lancamentos/${aluguel.id}`)).send({ tipo: 'RECEITA' }).expect(400);
    await comoA(http().patch(`/lancamentos/${aluguel.id}`)).send({ tipo: 'RECEITA', categoria: 'Salário' }).expect(200);
  });

  it('exige token', async () => {
    await http().get('/lancamentos?mes=2026-11').expect(401);
  });
});
