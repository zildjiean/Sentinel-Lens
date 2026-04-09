import { Resend } from "resend";
import nodemailer from "nodemailer";
import type { EmailConfig } from "@/lib/types/enterprise";
import { createClient } from "@/lib/supabase/server";

async function getEmailConfig(): Promise<EmailConfig | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "email_config")
    .single();
  if (!data?.value) return null;
  return data.value as EmailConfig;
}

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const config = await getEmailConfig();
  if (!config) {
    return { success: false, error: "Email not configured. Set up email in Settings → Email." };
  }

  const recipients = Array.isArray(params.to) ? params.to : [params.to];

  try {
    if (config.provider === "resend" || config.provider === "sendgrid") {
      const resend = new Resend(config.api_key);
      await resend.emails.send({
        from: `${config.from_name} <${config.from_address}>`,
        to: recipients,
        subject: params.subject,
        html: params.html,
      });
    } else if (config.provider === "smtp" && config.smtp_config) {
      const transporter = nodemailer.createTransport({
        host: config.smtp_config.host,
        port: config.smtp_config.port,
        secure: config.smtp_config.secure,
        auth: {
          user: config.smtp_config.user,
          pass: config.smtp_config.pass,
        },
      });
      await transporter.sendMail({
        from: `"${config.from_name}" <${config.from_address}>`,
        to: recipients.join(", "),
        subject: params.subject,
        html: params.html,
      });
    } else {
      return { success: false, error: `Unknown provider: ${config.provider}` };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[email] Send failed:", message);
    return { success: false, error: message };
  }
}

export async function sendTestEmail(toAddress: string): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: toAddress,
    subject: "[Sentinel Lens] Test Email",
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#1E3A5F;margin-bottom:8px;">Sentinel Lens</h2>
        <p style="color:#475569;">Email configuration is working correctly.</p>
        <p style="color:#94a3b8;font-size:12px;">Sent at ${new Date().toISOString()}</p>
      </div>
    `,
  });
}
