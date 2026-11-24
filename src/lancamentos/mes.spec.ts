import { intervaloDoMes, paraData, somarMeses } from './mes.js';

describe('mes', () => {
  it('intervalo do mês em UTC, com fim exclusivo', () => {
    const { inicio, fim } = intervaloDoMes('2026-11');
    expect(inicio.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(fim.toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });

  it('intervalo de dezembro termina no ano seguinte', () => {
    expect(intervaloDoMes('2026-12').fim.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('soma e subtrai meses atravessando o ano', () => {
    expect(somarMeses('2026-01', -1)).toBe('2025-12');
    expect(somarMeses('2026-02', -5)).toBe('2025-09');
    expect(somarMeses('2026-11', 1)).toBe('2026-12');
  });

  it('converte Date em YYYY-MM-DD pelo UTC', () => {
    expect(paraData(new Date('2026-11-30T00:00:00Z'))).toBe('2026-11-30');
  });
});
