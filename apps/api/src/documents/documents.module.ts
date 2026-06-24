import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { OrganizationsModule } from "../organizations/organizations.module.js";
import { DocumentsController } from "./documents.controller.js";
import { DocumentsRepository } from "./documents.repository.js";
import { DocumentsService } from "./documents.service.js";

@Module({
  controllers: [DocumentsController],
  imports: [AuthModule, DatabaseModule, OrganizationsModule],
  providers: [DocumentsRepository, DocumentsService],
})
export class DocumentsModule {}
