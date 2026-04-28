import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY ?? "";
const from = process.env.RESEND_FROM ?? "no-reply@zulla.example.com";

const client = apiKey ? new Resend(apiKey) : null;

export const resend = {
  enabled: Boolean(client),
  async send(opts: { to: string | string[]; subject: string; html: string; text?: string }) {
    if (!client) {
      console.warn("[resend] not configured — email skipped");
      return null;
    }
    return client.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
  },
};
