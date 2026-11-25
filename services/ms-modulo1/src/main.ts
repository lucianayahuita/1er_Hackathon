import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Chuno Banca · Clientes')
    .setDescription('Gestión de clientes, inicio de sesión y bloqueo tras tres intentos fallidos.')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', in: 'header', name: 'X-Service-Key' }, 'servicio')
    .setVersion('0.2.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`ms-modulo1 escuchando en http://localhost:${port} (Swagger: /docs)`);
}
bootstrap();
