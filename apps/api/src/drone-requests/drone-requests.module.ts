import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { OrganizationsModule } from "../organizations/organizations.module.js";
import { DroneRequestsController } from "./drone-requests.controller.js";
import { DroneRequestsRepository } from "./drone-requests.repository.js";
import { DroneRequestsService } from "./drone-requests.service.js";

@Module({
  controllers: [DroneRequestsController],
  imports: [AuthModule, DatabaseModule, OrganizationsModule],
  providers: [DroneRequestsRepository, DroneRequestsService],
})
export class DroneRequestsModule {}
