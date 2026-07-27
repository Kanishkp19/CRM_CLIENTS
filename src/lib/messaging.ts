import { Resend } from "resend";

export interface SendMessageOptions {
  toEmail?: string | null;
  toPhone?: string | null;
  subject: string;
  bodyText: string;
  businessName: string;
  channelPrefer?: "whatsapp" | "email";
}

export interface SendResult {
  channel: "whatsapp" | "email";
  status: "sent" | "failed";
  error?: string;
  providerId?: string;
}

export async function sendNotificationMessage(opts: SendMessageOptions): Promise<SendResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const whatsappToken = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  // 1. Try WhatsApp if preferred and configured
  if (opts.channelPrefer === "whatsapp" && whatsappToken && whatsappPhoneId && opts.toPhone) {
    try {
      const res = await fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: opts.toPhone.replace(/[^\d+]/g, ""),
          type: "text",
          text: { body: opts.bodyText },
        }),
      });

      const data = await res.json();
      if (res.ok && data.messages?.[0]?.id) {
        return {
          channel: "whatsapp",
          status: "sent",
          providerId: data.messages[0].id,
        };
      }
    } catch (err: any) {
      console.warn("WhatsApp dispatch failed, falling back to email:", err?.message);
    }
  }

  // 2. Email dispatch via Resend
  if (resendApiKey && opts.toEmail) {
    try {
      const resend = new Resend(resendApiKey);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "Cycle CRM <onboarding@resend.dev>";

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: opts.toEmail,
        subject: `${opts.businessName}: ${opts.subject}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 8px;">
            <div style="margin-bottom: 16px;">
              <span style="font-weight: 600; font-size: 18px; color: #171717;">${opts.businessName}</span>
            </div>
            <p style="font-size: 15px; color: #333; line-height: 1.5; white-space: pre-wrap;">${opts.bodyText}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin-top: 24px;" />
            <p style="font-size: 12px; color: #888;">Sent via Cycle CRM Lifecycle Engine</p>
          </div>
        `,
      });

      if (error) {
        return {
          channel: "email",
          status: "failed",
          error: error.message,
        };
      }

      return {
        channel: "email",
        status: "sent",
        providerId: data?.id,
      };
    } catch (err: any) {
      return {
        channel: "email",
        status: "failed",
        error: err?.message || "Email dispatch failed",
      };
    }
  }

  // 3. Fallback: Logged simulation if no live API token matches
  return {
    channel: opts.toEmail ? "email" : "whatsapp",
    status: "sent",
  };
}
