import { Inject, Injectable, Logger } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  getAppOrigin,
  getEmailProviderConfiguration,
  type EmailProviderConfiguration,
} from "../shared/config/environment.js";
import { SmtpEmailClientService } from "./smtp-email-client.service.js";

const logoDataUri = loadInvitationLogoDataUri();

function loadInvitationLogoDataUri(): string {
  try {
    const logoFileUrl = new URL("../../../web/public/logo.png", import.meta.url);
    const logoBuffer = readFileSync(fileURLToPath(logoFileUrl));

    return `data:image/png;base64,${logoBuffer.toString("base64")}`;
  } catch {
    return "";
  }
}

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
  readonly organizationName: string;
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
    const logoUrl = this.buildLogoUrl();
    const roleCodes = this.formatRoleCodes(input.roleCodes);

    return {
      from: fromAddress,
      html: this.buildInvitationHtml(
        invitationUrl,
        logoUrl,
        input.organizationName,
        roleCodes,
        input.expiresAt,
      ),
      metadata: {
        expiresAt: input.expiresAt,
        invitationId: input.invitationId,
        organizationId: input.organizationId,
        roleCodes: [...input.roleCodes],
      },
      subject: "Invitation SmartSite",
      text: this.buildInvitationText(
        invitationUrl,
        input.organizationName,
        roleCodes,
        input.expiresAt,
      ),
      to: input.email,
    };
  }

  private buildInvitationHtml(
    invitationUrl: string,
    logoUrl: string,
    organizationName: string,
    roleCodes: string,
    expiresAt: string,
  ): string {
    return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Invitation SmartSite</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f6f9;color:#1e293b;font-family:Inter,system-ui,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="min-width:100%;background-color:#f4f6f9;">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,0.08);">
            <tr>
              <td style="background-color:#8ca69c;padding:32px 24px;text-align:center;">
                <div style="display:inline-flex;align-items:center;justify-content:center;width:96px;height:96px;border-radius:22px;background-color:#ffffff;margin:0 auto 20px auto;">
                  <img src="${escapeHtml(logoUrl)}" alt="SmartSite" width="80" style="display:block;max-width:80px;height:auto;" />
                </div>
                <h1 style="margin:0;font-size:28px;line-height:36px;color:#ffffff;font-weight:700;">Invitation SmartSite</h1>
                <p style="margin:12px auto 0 auto;max-width:420px;font-size:16px;line-height:24px;color:rgba(255,255,255,0.92);">Vous êtes invité à rejoindre l'organisation ${escapeHtml(organizationName)} pour collaborer, suivre vos chantiers et gérer vos tâches.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 24px;">
                <p style="margin:0 0 18px 0;font-size:16px;line-height:26px;color:#334155;">Bonjour,</p>
                <p style="margin:0 0 24px 0;font-size:16px;line-height:26px;color:#334155;">Pour rejoindre l'organisation ${escapeHtml(organizationName)}, cliquez sur le bouton ci-dessous :</p>
                <div style="text-align:center;margin-bottom:32px;">
                  <a
                    href="${escapeHtml(invitationUrl)}"
                    style="display:inline-block;padding:14px 24px;font-size:16px;font-weight:700;color:#ffffff;background-color:#e5a46a;border-radius:9999px;text-decoration:none;box-shadow:0 12px 30px rgba(229,164,106,0.25);"
                    target="_blank"
                    rel="noopener noreferrer"
                  >Accepter l'invitation</a>
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:16px;background-color:#f8fafc;">
                  <tr>
                    <td style="padding:20px;">
                      <p style="margin:0 0 8px 0;font-size:14px;line-height:22px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Détails de l’invitation</p>
                      <p style="margin:0 0 8px 0;font-size:16px;line-height:24px;color:#0f172a;">Rôles attribués : <strong>${escapeHtml(roleCodes)}</strong></p>
                      <p style="margin:0;font-size:16px;line-height:24px;color:#0f172a;">Expiration : <strong>${escapeHtml(expiresAt)}</strong></p>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0 0;font-size:14px;line-height:22px;color:#64748b;">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :</p>
                <p style="margin:8px 0 0 0;font-size:14px;line-height:22px;color:#475569;word-break:break-all;"><a href="${escapeHtml(invitationUrl)}" style="color:#0f172a;text-decoration:underline;">${escapeHtml(invitationUrl)}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;border-top:1px solid #e2e8f0;background-color:#f8fafc;text-align:center;font-size:14px;line-height:20px;color:#64748b;">
                <p style="margin:0;">SmartSite — Gestion de chantier simplifiée</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  private buildInvitationText(
    invitationUrl: string,
    organizationName: string,
    roleCodes: string,
    expiresAt: string,
  ): string {
    return [
      `Vous avez été invité à rejoindre l'organisation ${organizationName}.`,
      `Rôles attribués : ${roleCodes}`,
      `Accepter l'invitation : ${invitationUrl}`,
      `Ce lien expire le ${expiresAt}.`,
      "Si le bouton ne fonctionne pas, copiez-collez le lien dans votre navigateur.",
    ].join("\n");
  }

  private formatRoleCodes(roleCodes: readonly string[]): string {
    return roleCodes.map((roleCode) => roleCode.replace(/_/g, " ")).join(", ");
  }

  private buildLogoUrl(): string {
    return logoDataUri || new URL("/logo.png", getAppOrigin()).toString();
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
