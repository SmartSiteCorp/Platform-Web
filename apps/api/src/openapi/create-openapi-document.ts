import type { OpenAPIObject } from "@nestjs/swagger";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";

import { AppModule } from "../app.module.js";

export async function createOpenApiDocument(): Promise<OpenAPIObject> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();

  app.setGlobalPrefix("api");

  const config = new DocumentBuilder()
    .setTitle("SmartSite API")
    .setDescription("SmartSite platform backend API.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  await app.close();

  return document;
}
