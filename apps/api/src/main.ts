import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { AppModule } from "./app.module.js";
import { getApiPort, getAppOrigin } from "./shared/config/environment.js";
import { setupOpenApi } from "./openapi/setup-openapi.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    credentials: true,
    origin: getAppOrigin(),
  });
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.setGlobalPrefix("api");

  setupOpenApi(app);

  await app.listen(getApiPort());
}

void bootstrap();
