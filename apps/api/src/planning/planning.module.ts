import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { OrganizationsModule } from "../organizations/organizations.module.js";
import { PhasesController } from "./phases.controller.js";
import { PhasesRepository } from "./phases.repository.js";
import { PhasesService } from "./phases.service.js";
import { ResourceAssignmentsController } from "./resource-assignments.controller.js";
import { ResourceAssignmentsRepository } from "./resource-assignments.repository.js";
import { ResourceAssignmentsService } from "./resource-assignments.service.js";

@Module({
  controllers: [PhasesController, ResourceAssignmentsController],
  imports: [AuthModule, DatabaseModule, OrganizationsModule],
  providers: [
    PhasesRepository,
    PhasesService,
    ResourceAssignmentsRepository,
    ResourceAssignmentsService,
  ],
})
export class PlanningModule {}
