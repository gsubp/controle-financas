import { ValidationPipe, type INestApplication } from '@nestjs/common';

export function configurarApp(app: INestApplication): void {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}
