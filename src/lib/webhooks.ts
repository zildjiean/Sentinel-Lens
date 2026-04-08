interface WebhookPayload {
  event: string;
  title: string;
  severity: string;
  url?: string;
  excerpt?: string;
  timestamp: string;
}

async function sendSlackWebhook(webhookUrl: string, payload: WebhookPayload) {
  const color = payload.severity === "critical" ? "#FFB4AB"
    : payload.severity === "high" ? "#FFB783"
    : payload.severity === "medium" ? "#BBC6E2"
    : "#4AE183";

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      attachments: [{
        color,
        title: `[${payload.severity.toUpperCase()}] ${payload.title}`,
        text: payload.excerpt || "",
        footer: "Sentinel Lens",
        ts: Math.floor(new Date(payload.timestamp).getTime() / 1000),
        ...(payload.url ? { title_link: payload.url } : {}),
      }],
    }),
  });
}

async function sendDiscordWebhook(webhookUrl: string, payload: WebhookPayload) {
  const color = payload.severity === "critical" ? 0xFFB4AB
    : payload.severity === "high" ? 0xFFB783
    : payload.severity === "medium" ? 0xBBC6E2
    : 0x4AE183;

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{
        title: `[${payload.severity.toUpperCase()}] ${payload.title}`,
        description: payload.excerpt || "",
        color,
        footer: { text: "Sentinel Lens" },
        timestamp: payload.timestamp,
        ...(payload.url ? { url: payload.url } : {}),
      }],
    }),
  });
}

async function sendLineWebhook(webhookUrl: string, payload: WebhookPayload) {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `🔒 [${payload.severity.toUpperCase()}] ${payload.title}\n\n${payload.excerpt || ""}\n\n${payload.url || ""}`,
    }),
  });
}

async function sendCustomWebhook(webhookUrl: string, payload: WebhookPayload) {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fireWebhooks(supabase: { from: (table: string) => unknown }, payload: WebhookPayload) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: webhooks } = await (supabase as any)
      .from("webhook_configs")
      .select("*")
      .eq("is_active", true)
      .contains("events", [payload.event]);

    if (!webhooks?.length) return;

    const promises = webhooks.map((wh: { type: string; url: string }) => {
      switch (wh.type) {
        case "slack": return sendSlackWebhook(wh.url, payload);
        case "discord": return sendDiscordWebhook(wh.url, payload);
        case "line": return sendLineWebhook(wh.url, payload);
        default: return sendCustomWebhook(wh.url, payload);
      }
    });

    await Promise.allSettled(promises);
  } catch {
    // Webhook failures should not block main operations
  }
}
