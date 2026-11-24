import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

const arquivoEnv = process.env.ENV_FILE ?? '.env';
if (existsSync(arquivoEnv)) process.loadEnvFile(arquivoEnv);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL },
});
