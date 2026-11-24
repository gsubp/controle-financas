import type { TipoLancamento } from '../generated/prisma/client.js';

export const CATEGORIAS: Record<TipoLancamento, readonly string[]> = {
  RECEITA: ['Salário', 'Freelance', 'Investimentos', 'Outros'],
  DESPESA: ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Contas', 'Educação', 'Lazer', 'Outros'],
};
