import { randomUUID } from 'node:crypto';
import type { Lancamento, TipoLancamento } from '../generated/prisma/client.js';
import { montarResumo } from './montar-resumo.js';

function l(tipo: TipoLancamento, descricao: string, categoria: string, valorCentavos: number, data: string): Lancamento {
  const quando = new Date(data + 'T00:00:00Z');
  return {
    id: randomUUID(),
    usuarioId: 'u',
    tipo,
    descricao,
    categoria,
    valorCentavos,
    data: quando,
    criadoEm: quando,
    atualizadoEm: quando,
  };
}
const R = (d: string, c: string, v: number, data: string) => l('RECEITA', d, c, v, data);
const D = (d: string, c: string, v: number, data: string) => l('DESPESA', d, c, v, data);

// Os 17 lançamentos de novembro do canvas + um par receita/despesa por mês de junho a outubro.
const CANVAS = [
  R('Salário', 'Salário', 850000, '2026-11-05'),
  R('Freelance — site institucional', 'Freelance', 180000, '2026-11-18'),
  R('Rendimento CDB', 'Investimentos', 14237, '2026-11-22'),
  D('Aluguel', 'Moradia', 240000, '2026-11-05'),
  D('Condomínio', 'Moradia', 62000, '2026-11-05'),
  D('Supermercado', 'Alimentação', 68745, '2026-11-12'),
  D('Supermercado', 'Alimentação', 41230, '2026-11-23'),
  D('Restaurante', 'Alimentação', 16800, '2026-11-15'),
  D('Plano de saúde', 'Saúde', 58900, '2026-11-07'),
  D('Farmácia', 'Saúde', 8760, '2026-11-14'),
  D('Combustível', 'Transporte', 29000, '2026-11-08'),
  D('Corrida de aplicativo', 'Transporte', 4680, '2026-11-20'),
  D('Energia elétrica', 'Contas', 21490, '2026-11-10'),
  D('Internet', 'Contas', 11990, '2026-11-10'),
  D('Curso online', 'Educação', 19700, '2026-11-01'),
  D('Streaming de vídeo', 'Lazer', 5590, '2026-11-12'),
  D('Cinema', 'Lazer', 6400, '2026-11-16'),
  ...(
    [
      ['2026-06', 850000, 612040],
      ['2026-07', 930000, 748015],
      ['2026-08', 862055, 587090],
      ['2026-09', 850000, 641030],
      ['2026-10', 1010000, 690560],
    ] as const
  ).flatMap(([mes, r, d]) => [R('Salário', 'Salário', r, `${mes}-10`), D('Aluguel', 'Moradia', d, `${mes}-10`)]),
  // Fora da janela de 6 meses: não pode contar.
  R('Antigo', 'Salário', 999999, '2026-05-31'),
  D('Futuro', 'Moradia', 999999, '2026-12-01'),
];

describe('montarResumo', () => {
  it('reproduz os números do canvas', () => {
    const r = montarResumo('2026-11', CANVAS);
    expect(r.mes).toBe('2026-11');
    expect(r.receitasCentavos).toBe(1044237);
    expect(r.despesasCentavos).toBe(595285);
    expect(r.saldoCentavos).toBe(448952);
    expect(r.taxaPoupanca).toBe(43);
    expect(r.quantidade).toBe(17);
    expect(r.variacao).toEqual({ receitas: 3.4, despesas: -13.8, saldo: 40.5 });
  });

  it('monta o histórico de 6 meses terminando no mês pedido', () => {
    const { historico } = montarResumo('2026-11', CANVAS);
    expect(historico.map((h) => h.mes)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
    expect(historico[0]).toEqual({ mes: '2026-06', receitasCentavos: 850000, despesasCentavos: 612040 });
    expect(historico[5]).toEqual({ mes: '2026-11', receitasCentavos: 1044237, despesasCentavos: 595285 });
  });

  it('agrupa despesas por categoria, maior primeiro', () => {
    expect(montarResumo('2026-11', CANVAS).porCategoria).toEqual([
      { categoria: 'Moradia', totalCentavos: 302000, percentual: 50.7 },
      { categoria: 'Alimentação', totalCentavos: 126775, percentual: 21.3 },
      { categoria: 'Saúde', totalCentavos: 67660, percentual: 11.4 },
      { categoria: 'Transporte', totalCentavos: 33680, percentual: 5.7 },
      { categoria: 'Contas', totalCentavos: 33480, percentual: 5.6 },
      { categoria: 'Educação', totalCentavos: 19700, percentual: 3.3 },
      { categoria: 'Lazer', totalCentavos: 11990, percentual: 2 },
    ]);
  });

  it('lista os 6 lançamentos mais recentes do mês, independente da ordem de entrada', () => {
    const { recentes } = montarResumo('2026-11', [...CANVAS].reverse());
    expect(recentes.map((x) => x.descricao)).toEqual([
      'Supermercado',
      'Rendimento CDB',
      'Corrida de aplicativo',
      'Freelance — site institucional',
      'Cinema',
      'Restaurante',
    ]);
    expect(recentes[0]).toEqual({
      id: expect.any(String),
      tipo: 'DESPESA',
      descricao: 'Supermercado',
      categoria: 'Alimentação',
      valorCentavos: 41230,
      data: '2026-11-23',
    });
  });

  it('mês sem lançamentos', () => {
    const r = montarResumo('2026-11', []);
    expect(r).toEqual({
      mes: '2026-11',
      receitasCentavos: 0,
      despesasCentavos: 0,
      saldoCentavos: 0,
      taxaPoupanca: null,
      variacao: { receitas: null, despesas: null, saldo: null },
      historico: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'].map((mes) => ({
        mes,
        receitasCentavos: 0,
        despesasCentavos: 0,
      })),
      porCategoria: [],
      recentes: [],
      quantidade: 0,
    });
  });

  it('variação do saldo sobre saldo anterior negativo', () => {
    const r = montarResumo('2026-11', [
      R('Salário', 'Salário', 10000, '2026-10-05'),
      D('Aluguel', 'Moradia', 20000, '2026-10-06'),
      R('Salário', 'Salário', 5000, '2026-11-05'),
    ]);
    expect(r.variacao.saldo).toBe(150);
  });

  it('histórico atravessa a virada do ano', () => {
    expect(montarResumo('2026-02', []).historico[0].mes).toBe('2025-09');
  });
});
