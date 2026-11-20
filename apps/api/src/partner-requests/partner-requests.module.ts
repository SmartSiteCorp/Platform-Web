import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { OrganizationsModule } from "../organizations/organizations.module.js";
import { PartnerRequestsController } from "./partner-requests.controller.js";
import { PartnerRequestsRepository } from "./partner-requests.repository.js";
import { PartnerRequestsService } from "./partner-requests.service.js";

@Module({
  controllers: [PartnerRequestsController],
  imports: [AuthModule, DatabaseModule, OrganizationsModule],
  providers: [PartnerRequestsRepository, PartnerRequestsService],
})
export class PartnerRequestsModule {}
