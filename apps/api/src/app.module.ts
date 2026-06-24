import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./auth/auth.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { DocumentsModule } from "./documents/documents.module.js";
import { HealthModule } from "./health/health.module.js";
import { OrganizationsModule } from "./organizations/organizations.module.js";
import { getEnvironmentFilePaths } from "./shared/config/environment.js";
import { SitesModule } from "./sites/sites.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: getEnvironmentFilePaths(),
      isGlobal: true,
    }),
    AuthModule,
    DatabaseModule,
    DocumentsModule,
    HealthModule,
    OrganizationsModule,
    SitesModule,
  ],
})
export class AppModule {}
