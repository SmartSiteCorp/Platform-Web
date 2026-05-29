import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function setupOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("SmartSite API")
    .setDescription("SmartSite platform backend API.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("api/docs", app, documentFactory, {
    jsonDocumentUrl: "api/openapi.json",
  });
}
