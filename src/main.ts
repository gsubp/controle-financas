import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configurarApp } from './configurar-app.js';

async function bootstrap() {
  process.loadEnvFile();
  const app = await NestFactory.create(AppModule);
  configurarApp(app);
  await app.listen(process.env.PORT ?? 3333);
}
await bootstrap();
