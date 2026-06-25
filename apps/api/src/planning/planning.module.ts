import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { OrganizationsModule } from "../organizations/organizations.module.js";
import { PhasesController } from "./phases.controller.js";
import { PhasesRepository } from "./phases.repository.js";
import { PhasesService } from "./phases.service.js";

@Module({
  controllers: [PhasesController],
  imports: [AuthModule, DatabaseModule, OrganizationsModule],
  providers: [PhasesRepository, PhasesService],
})
export class PlanningModule {}
