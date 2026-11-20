import { Injectable } from "@nestjs/common";
import { createTransport, type SendMailOptions, type Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";

import type { EmailSmtpConfiguration } from "../shared/config/environment.js";

export interface SmtpEmailMessage {
  readonly from: string;
  readonly html: string;
  readonly subject: string;
  readonly text: string;
  readonly to: string;
}

@Injectable()
export class SmtpEmailClientService {
  public async sendEmail(
    configuration: EmailSmtpConfiguration,
    message: SmtpEmailMessage,
  ): Promise<void> {
    const transporter = this.createTransporter(configuration);
    const mailOptions = this.createMailOptions(message);

    await transporter.sendMail(mailOptions);
  }

  private createTransporter(
    configuration: EmailSmtpConfiguration,
  ): Transporter<SMTPTransport.SentMessageInfo, SMTPTransport.Options> {
    return createTransport({
      auth: {
        pass: configuration.password,
        user: configuration.user,
      },
      host: configuration.host,
      port: configuration.port,
      secure: configuration.secure,
    });
  }

  private createMailOptions(message: SmtpEmailMessage): SendMailOptions {
    return {
      from: message.from,
      html: message.html,
      subject: message.subject,
      text: message.text,
      to: message.to,
    };
  }
}
