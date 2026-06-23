import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { OrganizationsModule } from "../organizations/organizations.module.js";
import { SitesController } from "./sites.controller.js";
import { SitesRepository } from "./sites.repository.js";
import { SitesService } from "./sites.service.js";

@Module({
  controllers: [SitesController],
  imports: [AuthModule, DatabaseModule, OrganizationsModule],
  providers: [SitesRepository, SitesService],
})
export class SitesModule {}
