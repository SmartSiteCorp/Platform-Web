import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { OrganizationInvitationAcceptanceRepository } from "./organization-invitation-acceptance.repository.js";
import { OrganizationInvitationEmailService } from "./organization-invitation-email.service.js";
import { OrganizationInvitationTokenService } from "./organization-invitation-token.service.js";
import { OrganizationInvitationsController } from "./organization-invitations.controller.js";
import { OrganizationInvitationsRepository } from "./organization-invitations.repository.js";
import { OrganizationInvitationsService } from "./organization-invitations.service.js";
import { OrganizationUserRolesController } from "./organization-user-roles.controller.js";
import { OrganizationUserRolesRepository } from "./organization-user-roles.repository.js";
import { OrganizationUserRolesService } from "./organization-user-roles.service.js";
import { OrganizationsController } from "./organizations.controller.js";
import { OrganizationsRepository } from "./organizations.repository.js";
import { OrganizationsService } from "./organizations.service.js";
import { SmtpEmailClientService } from "./smtp-email-client.service.js";

@Module({
  controllers: [
    OrganizationsController,
    OrganizationInvitationsController,
    OrganizationUserRolesController,
  ],
  imports: [AuthModule, DatabaseModule],
  providers: [
    OrganizationInvitationAcceptanceRepository,
    OrganizationInvitationEmailService,
    OrganizationInvitationTokenService,
    OrganizationInvitationsRepository,
    OrganizationInvitationsService,
    OrganizationUserRolesRepository,
    OrganizationUserRolesService,
    OrganizationsRepository,
    OrganizationsService,
    SmtpEmailClientService,
  ],
})
export class OrganizationsModule {}
