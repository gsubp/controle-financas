import type { Lancamento } from '../generated/prisma/client.js';
import { paraResposta, type LancamentoResposta } from '../lancamentos/lancamentos.service.js';
import { paraData, somarMeses } from '../lancamentos/mes.js';

type TotaisMes = { mes: string; receitasCentavos: number; despesasCentavos: number };

export type Resumo = {
  mes: string;
  receitasCentavos: number;
  despesasCentavos: number;
  saldoCentavos: number;
  taxaPoupanca: number | null;
  variacao: { receitas: number | null; despesas: number | null; saldo: number | null };
  historico: TotaisMes[];
  porCategoria: { categoria: string; totalCentavos: number; percentual: number }[];
  recentes: LancamentoResposta[];
  quantidade: number;
};

const umaCasa = (x: number) => Math.round(x * 10) / 10;
const variacao = (atual: number, anterior: number) =>
  anterior === 0 ? null : umaCasa(((atual - anterior) / Math.abs(anterior)) * 100);

/** Resumo de `mes` a partir dos lançamentos da janela de 6 meses; ignora o que estiver fora dela. */
export function montarResumo(mes: string, lancamentos: Lancamento[]): Resumo {
  const historico: TotaisMes[] = [-5, -4, -3, -2, -1, 0].map((n) => ({
    mes: somarMeses(mes, n),
    receitasCentavos: 0,
    despesasCentavos: 0,
  }));
  const porMes = new Map(historico.map((h) => [h.mes, h]));
  const doMes: Lancamento[] = [];
  const porCategoria = new Map<string, number>();

  for (const l of lancamentos) {
    const totais = porMes.get(paraData(l.data).slice(0, 7));
    if (!totais) continue;
    if (l.tipo === 'RECEITA') totais.receitasCentavos += l.valorCentavos;
    else totais.despesasCentavos += l.valorCentavos;
    if (totais.mes !== mes) continue;
    doMes.push(l);
    if (l.tipo === 'DESPESA') porCategoria.set(l.categoria, (porCategoria.get(l.categoria) ?? 0) + l.valorCentavos);
  }

  const [anterior, atual] = historico.slice(-2);
  const saldo = atual.receitasCentavos - atual.despesasCentavos;

  return {
    mes,
    receitasCentavos: atual.receitasCentavos,
    despesasCentavos: atual.despesasCentavos,
    saldoCentavos: saldo,
    taxaPoupanca: atual.receitasCentavos === 0 ? null : umaCasa((saldo / atual.receitasCentavos) * 100),
    variacao: {
      receitas: variacao(atual.receitasCentavos, anterior.receitasCentavos),
      despesas: variacao(atual.despesasCentavos, anterior.despesasCentavos),
      saldo: variacao(saldo, anterior.receitasCentavos - anterior.despesasCentavos),
    },
    historico,
    porCategoria: [...porCategoria]
      .map(([categoria, totalCentavos]) => ({
        categoria,
        totalCentavos,
        percentual: umaCasa((totalCentavos / atual.despesasCentavos) * 100),
      }))
      .sort((a, b) => b.totalCentavos - a.totalCentavos),
    recentes: doMes
      .sort((a, b) => b.data.getTime() - a.data.getTime() || b.criadoEm.getTime() - a.criadoEm.getTime())
      .slice(0, 6)
      .map(paraResposta),
    quantidade: doMes.length,
  };
}
