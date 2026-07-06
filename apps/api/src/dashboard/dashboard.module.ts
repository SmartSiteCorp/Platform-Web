import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { OrganizationsModule } from "../organizations/organizations.module.js";
import { ArchitectDashboardRepository } from "./architect-dashboard.repository.js";
import { ArchitectDashboardService } from "./architect-dashboard.service.js";
import { DashboardController } from "./dashboard.controller.js";
import { DashboardRepository } from "./dashboard.repository.js";
import { DashboardService } from "./dashboard.service.js";
import { DroneOperatorDashboardRepository } from "./drone-operator-dashboard.repository.js";
import { DroneOperatorDashboardService } from "./drone-operator-dashboard.service.js";

@Module({
  controllers: [DashboardController],
  imports: [AuthModule, DatabaseModule, OrganizationsModule],
  providers: [
    ArchitectDashboardRepository,
    ArchitectDashboardService,
    DashboardRepository,
    DashboardService,
    DroneOperatorDashboardRepository,
    DroneOperatorDashboardService,
  ],
})
export class DashboardModule {}
