import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { cadastrar, criarApp, SENHA_TESTE } from './util.js';

describe('auth (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await criarApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('cadastra e devolve token e usuário sem o hash da senha', async () => {
    const email = `teste-${randomUUID()}@exemplo.com`;
    const res = await http().post('/auth/cadastro').send({ nome: 'Ana', email, senha: SENHA_TESTE }).expect(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.usuario).toEqual({ id: expect.any(String), nome: 'Ana', email });
    expect(res.body.usuario.senhaHash).toBeUndefined();
  });

  it('recusa e-mail já cadastrado mesmo com maiúsculas e espaços', async () => {
    const { usuario } = await cadastrar(app);
    await http()
      .post('/auth/cadastro')
      .send({ nome: 'Outra', email: '  ' + usuario.email.toUpperCase(), senha: SENHA_TESTE })
      .expect(409);
  });

  it('valida o cadastro', async () => {
    const email = `teste-${randomUUID()}@exemplo.com`;
    await http().post('/auth/cadastro').send({ nome: 'Ana', email, senha: '1234567' }).expect(400);
    await http().post('/auth/cadastro').send({ nome: 'Ana', email: 'nao-e-email', senha: SENHA_TESTE }).expect(400);
    await http().post('/auth/cadastro').send({ nome: 'Ana', email, senha: SENHA_TESTE, admin: true }).expect(400);
  });

  it('faz login com e-mail em maiúsculas e espaços', async () => {
    const { usuario } = await cadastrar(app);
    const res = await http()
      .post('/auth/login')
      .send({ email: ` ${usuario.email.toUpperCase()} `, senha: SENHA_TESTE })
      .expect(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.usuario).toEqual(usuario);
  });

  it('responde a mesma mensagem para senha errada e e-mail inexistente', async () => {
    const { usuario } = await cadastrar(app);
    const errada = await http().post('/auth/login').send({ email: usuario.email, senha: 'outra-senha' }).expect(401);
    const inexistente = await http()
      .post('/auth/login')
      .send({ email: `ninguem-${randomUUID()}@exemplo.com`, senha: SENHA_TESTE })
      .expect(401);
    expect(errada.body.message).toBe('E-mail ou senha inválidos');
    expect(inexistente.body.message).toBe('E-mail ou senha inválidos');
  });

  it('devolve o usuário logado em /auth/me', async () => {
    const { token, usuario } = await cadastrar(app);
    const res = await http().get('/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body).toEqual(usuario);
  });

  it('recusa /auth/me sem token, com token malformado ou de outro segredo', async () => {
    const { usuario } = await cadastrar(app);
    const forjado = new JwtService({ secret: 'outro' }).sign({ sub: usuario.id });
    await http().get('/auth/me').expect(401);
    await http().get('/auth/me').set('Authorization', 'Bearer abc').expect(401);
    await http().get('/auth/me').set('Authorization', `Bearer ${forjado}`).expect(401);
  });
});
