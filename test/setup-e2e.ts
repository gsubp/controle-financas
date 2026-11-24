process.loadEnvFile(process.env.ENV_FILE ?? '.env.test');

// Trava: e2e grava usuários e lançamentos; nunca deixar rodar fora do banco de teste.
if (new URL(process.env.DATABASE_URL ?? 'x:').pathname !== '/controle_financas_test') {
  throw new Error('DATABASE_URL não aponta para controle_financas_test');
}
