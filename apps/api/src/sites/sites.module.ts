import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { OrganizationsModule } from "../organizations/organizations.module.js";
import { ProjectUsersController } from "./project-users.controller.js";
import { ProjectUsersRepository } from "./project-users.repository.js";
import { ProjectUsersService } from "./project-users.service.js";
import { SitesController } from "./sites.controller.js";
import { SitesRepository } from "./sites.repository.js";
import { SitesService } from "./sites.service.js";

@Module({
  controllers: [SitesController, ProjectUsersController],
  imports: [AuthModule, DatabaseModule, OrganizationsModule],
  providers: [SitesRepository, SitesService, ProjectUsersRepository, ProjectUsersService],
})
export class SitesModule {}
