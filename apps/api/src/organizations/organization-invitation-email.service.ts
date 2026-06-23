import { Inject, Injectable, Logger } from "@nestjs/common";

import {
  getAppOrigin,
  getEmailProviderConfiguration,
  type EmailProviderConfiguration,
} from "../shared/config/environment.js";
import { SmtpEmailClientService } from "./smtp-email-client.service.js";

export type OrganizationInvitationEmailDeliveryStatus = "failed" | "sent";

export interface OrganizationInvitationEmailDeliveryResult {
  readonly failureReason: string | null;
  readonly provider: EmailProviderConfiguration["provider"];
  readonly status: OrganizationInvitationEmailDeliveryStatus;
}

export interface SendOrganizationInvitationEmailInput {
  readonly email: string;
  readonly expiresAt: string;
  readonly invitationId: string;
  readonly organizationId: string;
  readonly roleCodes: readonly string[];
  readonly token: string;
}

interface InvitationEmailMetadata {
  readonly expiresAt: string;
  readonly invitationId: string;
  readonly organizationId: string;
  readonly roleCodes: readonly string[];
}

interface InvitationEmailPayload {
  readonly from: string;
  readonly html: string;
  readonly metadata: InvitationEmailMetadata;
  readonly subject: string;
  readonly text: string;
  readonly to: string;
}

type HttpEmailProviderConfiguration = Extract<
  EmailProviderConfiguration,
  { readonly provider: "http" }
>;

type SmtpEmailProviderConfiguration = Extract<
  EmailProviderConfiguration,
  { readonly provider: "smtp" }
>;

@Injectable()
export class OrganizationInvitationEmailService {
  private readonly logger = new Logger(OrganizationInvitationEmailService.name);

  public constructor(
    @Inject(SmtpEmailClientService)
    private readonly smtpEmailClientService: SmtpEmailClientService,
  ) {}

  public async sendInvitation(
    input: SendOrganizationInvitationEmailInput,
  ): Promise<OrganizationInvitationEmailDeliveryResult> {
    const configuration = getEmailProviderConfiguration();
    const payload = this.buildInvitationPayload(input, configuration.fromAddress);

    if (configuration.provider === "http") {
      return this.sendThroughHttpProvider(configuration, payload);
    }

    if (configuration.provider === "smtp") {
      return this.sendThroughSmtpProvider(configuration, payload);
    }

    this.logDelivery("organization.invitation.email_logged", payload.metadata, "sent");

    return {
      failureReason: null,
      provider: configuration.provider,
      status: "sent",
    };
  }

  private async sendThroughSmtpProvider(
    configuration: SmtpEmailProviderConfiguration,
    payload: InvitationEmailPayload,
  ): Promise<OrganizationInvitationEmailDeliveryResult> {
    try {
      await this.smtpEmailClientService.sendEmail(configuration.smtp, {
        from: payload.from,
        html: payload.html,
        subject: payload.subject,
        text: payload.text,
        to: payload.to,
      });

      this.logDelivery("organization.invitation.email_sent", payload.metadata, "sent");

      return {
        failureReason: null,
        provider: configuration.provider,
        status: "sent",
      };
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : "Erreur inconnue";

      this.logDelivery("organization.invitation.email_failed", payload.metadata, "failed");

      return {
        failureReason,
        provider: configuration.provider,
        status: "failed",
      };
    }
  }

  private async sendThroughHttpProvider(
    configuration: HttpEmailProviderConfiguration,
    payload: InvitationEmailPayload,
  ): Promise<OrganizationInvitationEmailDeliveryResult> {
    try {
      const response = await fetch(configuration.httpEndpoint, {
        body: JSON.stringify(payload),
        headers: this.createHttpHeaders(configuration),
        method: "POST",
      });

      if (response.ok) {
        this.logDelivery("organization.invitation.email_sent", payload.metadata, "sent");

        return {
          failureReason: null,
          provider: configuration.provider,
          status: "sent",
        };
      }

      const failureReason = `Provider returned HTTP ${response.status.toString()}.`;

      this.logDelivery("organization.invitation.email_failed", payload.metadata, "failed");

      return {
        failureReason,
        provider: configuration.provider,
        status: "failed",
      };
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : "Erreur inconnue";

      this.logDelivery("organization.invitation.email_failed", payload.metadata, "failed");

      return {
        failureReason,
        provider: configuration.provider,
        status: "failed",
      };
    }
  }

  private buildInvitationPayload(
    input: SendOrganizationInvitationEmailInput,
    fromAddress: string,
  ): InvitationEmailPayload {
    const invitationUrl = this.buildInvitationUrl(input.token);
    const roleCodes = input.roleCodes.join(", ");

    return {
      from: fromAddress,
      html: [
        "<p>Vous avez été invité à rejoindre une organisation SmartSite.</p>",
        `<p>Rôles attribués : ${escapeHtml(roleCodes)}</p>`,
        `<p><a href="${escapeHtml(invitationUrl)}">Accepter l'invitation</a></p>`,
        `<p>Ce lien expire le ${escapeHtml(input.expiresAt)}.</p>`,
      ].join(""),
      metadata: {
        expiresAt: input.expiresAt,
        invitationId: input.invitationId,
        organizationId: input.organizationId,
        roleCodes: [...input.roleCodes],
      },
      subject: "Invitation SmartSite",
      text: [
        "Vous avez été invité à rejoindre une organisation SmartSite.",
        `Rôles attribués : ${roleCodes}`,
        `Lien d'invitation : ${invitationUrl}`,
        `Ce lien expire le ${input.expiresAt}.`,
      ].join("\n"),
      to: input.email,
    };
  }

  private buildInvitationUrl(token: string): string {
    const invitationUrl = new URL("/invitations/accept", getAppOrigin());

    invitationUrl.searchParams.set("token", token);

    return invitationUrl.toString();
  }

  private createHttpHeaders(configuration: HttpEmailProviderConfiguration): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (configuration.httpBearerToken) {
      headers.Authorization = `Bearer ${configuration.httpBearerToken}`;
    }

    return headers;
  }

  private logDelivery(
    eventName: string,
    metadata: InvitationEmailMetadata,
    status: OrganizationInvitationEmailDeliveryStatus,
  ): void {
    this.logger.log(
      JSON.stringify({
        eventName,
        invitationId: metadata.invitationId,
        organizationId: metadata.organizationId,
        status,
      }),
    );
  }
}

const htmlEscapes: Readonly<Record<string, string>> = {
  '"': "&quot;",
  "&": "&amp;",
  "'": "&#39;",
  "<": "&lt;",
  ">": "&gt;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => htmlEscapes[character] ?? character);
}
