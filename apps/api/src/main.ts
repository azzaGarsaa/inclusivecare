import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { buildOpenApiDocument, configureApp } from './bootstrap.js';
import { appConfig } from './config/app.config.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);
  configureApp(app);

  const config = app.get<ReturnType<typeof appConfig>>(appConfig.KEY);
  if (config.nodeEnv === 'production') {
    // Behind the reverse proxy, so that request.ip is the visitor's address.
    app.set('trust proxy', 1);
  } else {
    SwaggerModule.setup('api/docs', app, () => buildOpenApiDocument(app));
  }

  app.enableShutdownHooks();
  await app.listen(config.port);
  logger.log(`API listening on http://localhost:${config.port}/api/v1`);
}

await bootstrap();
