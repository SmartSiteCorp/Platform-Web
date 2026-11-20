import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { configureHttpApp } from "./app-http.js";
import { AppModule } from "./app.module.js";
import { getApiPort } from "./shared/config/environment.js";
import { setupOpenApi } from "./openapi/setup-openapi.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  configureHttpApp(app);
  setupOpenApi(app);

  await app.listen(getApiPort());
}

void bootstrap();
