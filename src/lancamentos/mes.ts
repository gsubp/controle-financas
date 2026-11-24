export const MES_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

function inicioDoMes(mes: string): Date {
  const [ano, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(ano, m - 1, 1));
}

export function somarMeses(mes: string, n: number): string {
  const d = inicioDoMes(mes);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}

/** Datas UTC 00:00; `fim` é exclusivo (dia 1 do mês seguinte). */
export function intervaloDoMes(mes: string): { inicio: Date; fim: Date } {
  return { inicio: inicioDoMes(mes), fim: inicioDoMes(somarMeses(mes, 1)) };
}

export function paraData(d: Date): string {
  return d.toISOString().slice(0, 10);
}
