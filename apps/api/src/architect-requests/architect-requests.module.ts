import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { OrganizationsModule } from "../organizations/organizations.module.js";
import { ArchitectRequestsController } from "./architect-requests.controller.js";
import { ArchitectRequestsRepository } from "./architect-requests.repository.js";
import { ArchitectRequestsService } from "./architect-requests.service.js";

@Module({
  controllers: [ArchitectRequestsController],
  imports: [AuthModule, DatabaseModule, OrganizationsModule],
  providers: [ArchitectRequestsRepository, ArchitectRequestsService],
})
export class ArchitectRequestsModule {}
