import twilioFactory from "twilio";

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
// Spec: TWILIO_PHONE_NUMBER. Accept legacy TWILIO_FROM as fallback.
const from = process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_FROM ?? "";

const client = sid && token ? twilioFactory(sid, token) : null;

export const twilio = {
  enabled: Boolean(client),
  async sendSms(to: string, body: string) {
    if (!client) {
      console.warn("[twilio] not configured — sms skipped");
      return null;
    }
    return client.messages.create({ to, from, body });
  },
};
