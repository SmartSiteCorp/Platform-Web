import { afterEach, describe, expect, it } from "vitest";

import type { EmailSmtpConfiguration } from "../shared/config/environment.js";
import { OrganizationInvitationEmailService } from "./organization-invitation-email.service.js";
import { SmtpEmailClientService, type SmtpEmailMessage } from "./smtp-email-client.service.js";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe("OrganizationInvitationEmailService", () => {
  it("sends invitation emails through the SMTP provider", async () => {
    const smtpEmailClientService = new RecordingSmtpEmailClientService();
    const service = new OrganizationInvitationEmailService(smtpEmailClientService);

    configureSmtpEnvironment();

    const result = await service.sendInvitation({
      email: "alex.fraioli@example.com",
      expiresAt: "2026-06-30T12:00:00.000Z",
      invitationId: "invitation-id",
      organizationId: "organization-id",
      organizationName: "Stern Bat",
      roleCodes: ["architecte"],
      token: "secure-invitation-token",
    });
    const sentMessage = smtpEmailClientService.getSentMessage();
    const sentConfiguration = smtpEmailClientService.getSentConfiguration();

    expect(result).toStrictEqual({
      failureReason: null,
      provider: "smtp",
      status: "sent",
    });
    expect(sentConfiguration).toMatchObject({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      user: "andreearbb@gmail.com",
    });
    expect(sentMessage).toMatchObject({
      from: "andreearbb@gmail.com",
      subject: "Invitation Stern Bat",
      to: "alex.fraioli@example.com",
    });
    expect(sentMessage.text).toContain(
      "Vous avez été invité à rejoindre l'organisation Stern Bat.",
    );
    expect(sentMessage.html).toContain("Invitation chez Stern Bat");
    expect(sentMessage.html).toContain('alt="Logo Stern Bat"');
    expect(sentMessage.text).toContain("secure-invitation-token");
    expect(sentMessage.html).toContain("Accepter l'invitation");
    expect(sentMessage.html).toContain("data:image/png;base64,");
  });

  it("returns a failed delivery result when the SMTP provider rejects the email", async () => {
    const service = new OrganizationInvitationEmailService(new FailingSmtpEmailClientService());

    configureSmtpEnvironment();

    const result = await service.sendInvitation({
      email: "alex.fraioli@example.com",
      expiresAt: "2026-06-30T12:00:00.000Z",
      invitationId: "invitation-id",
      organizationId: "organization-id",
      organizationName: "Stern Bat",
      roleCodes: ["architecte"],
      token: "secure-invitation-token",
    });

    expect(result).toStrictEqual({
      failureReason: "SMTP unavailable",
      provider: "smtp",
      status: "failed",
    });
  });
});

class RecordingSmtpEmailClientService extends SmtpEmailClientService {
  private sentConfiguration: EmailSmtpConfiguration | null = null;
  private sentMessage: SmtpEmailMessage | null = null;

  public override sendEmail(
    configuration: EmailSmtpConfiguration,
    message: SmtpEmailMessage,
  ): Promise<void> {
    this.sentConfiguration = configuration;
    this.sentMessage = message;

    return Promise.resolve();
  }

  public getSentConfiguration(): EmailSmtpConfiguration {
    if (!this.sentConfiguration) {
      throw new Error("SMTP configuration was not recorded.");
    }

    return this.sentConfiguration;
  }

  public getSentMessage(): SmtpEmailMessage {
    if (!this.sentMessage) {
      throw new Error("SMTP message was not recorded.");
    }

    return this.sentMessage;
  }
}

class FailingSmtpEmailClientService extends SmtpEmailClientService {
  public override sendEmail(): Promise<void> {
    return Promise.reject(new Error("SMTP unavailable"));
  }
}

function configureSmtpEnvironment(): void {
  process.env.APP_ORIGIN = "http://localhost:3000";
  process.env.EMAIL_FROM_ADDRESS = "andreearbb@gmail.com";
  process.env.EMAIL_PROVIDER = "smtp";
  process.env.EMAIL_SMTP_HOST = "smtp.gmail.com";
  process.env.EMAIL_SMTP_PASSWORD = "application-password";
  process.env.EMAIL_SMTP_PORT = "465";
  process.env.EMAIL_SMTP_SECURE = "true";
  process.env.EMAIL_SMTP_USER = "andreearbb@gmail.com";
}
