import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('ms-modulo5')
    .setDescription('Módulo 5')
    .addBearerAuth()
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT ?? 3005;
  await app.listen(port);
  console.log(`ms-modulo5 escuchando en http://localhost:${port} (Swagger: /docs)`);
}
bootstrap();
