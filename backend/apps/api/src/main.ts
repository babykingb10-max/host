import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import { PrismaService } from './common/prisma.service';
import { createGlobalValidationPipe } from './common/validation/validation.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.use(helmet());
  app.enableCors({
    origin: config.get<string>('CORS_ORIGINS')!.split(',').map((o) => o.trim()),
    credentials: true,
  });

  // Manual body parsing (bodyParser disabled above) so webhook signature
  // verification (GitHub, payment providers) has access to the exact
  // raw bytes GitHub signed — re-serializing the parsed JSON would not
  // byte-for-byte match and would break HMAC verification.
  app.use(
    express.json({
      verify: (req: express.Request & { rawBody?: Buffer }, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));

  app.setGlobalPrefix('api');
  app.useGlobalPipes(createGlobalValidationPipe());

  const prisma = app.get(PrismaService);
  await prisma.enableShutdownHooks(app);
  app.enableShutdownHooks(); // SIGTERM/SIGINT → onModuleDestroy across the app

  if (config.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Adevos-X Tech Host Platform API')
      .setDescription('REST API for the Adevos-X unified hosting platform')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = config.get<number>('PORT')!;
  await app.listen(port);
  logger.log(`Adevos-X API listening on :${port} (${config.get<string>('NODE_ENV')})`);
}

bootstrap();
