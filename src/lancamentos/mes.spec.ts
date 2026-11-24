import { dataValida, intervaloDoMes, MES_REGEX, paraData, somarMeses } from './mes.js';

describe('mes', () => {
  it('aceita só anos 1900–2099 (ano de 2 dígitos no input date vira 00xx)', () => {
    expect(dataValida('2026-11-23')).toBe(true);
    expect(dataValida('0026-11-23')).toBe(false);
    expect(dataValida('0000-01-01')).toBe(false);
    expect(MES_REGEX.test('2026-11')).toBe(true);
    expect(MES_REGEX.test('0026-11')).toBe(false);
    expect(MES_REGEX.test('9999-12')).toBe(false);
  });

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
