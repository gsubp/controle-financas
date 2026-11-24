import { hashSenha, verificarSenha } from './senha.js';

describe('senha', () => {
  it('gera hash scrypt com salt diferente a cada chamada', async () => {
    const a = await hashSenha('abc12345');
    const b = await hashSenha('abc12345');
    expect(a.startsWith('scrypt$')).toBe(true);
    expect(a).not.toBe(b);
  });

  it('confere a senha certa e recusa a errada', async () => {
    const hash = await hashSenha('abc12345');
    expect(await verificarSenha('abc12345', hash)).toBe(true);
    expect(await verificarSenha('outra', hash)).toBe(false);
  });

  it('recusa hash malformado sem lançar erro', async () => {
    expect(await verificarSenha('abc12345', 'lixo')).toBe(false);
  });
});
