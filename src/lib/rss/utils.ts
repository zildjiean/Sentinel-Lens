export const SEVERITY_KEYWORDS: Record<string, string[]> = {
  critical: ["breach", "zero-day", "zero day", "0-day", "ransomware", "rce", "remote code execution"],
  high: ["vulnerability", "exploit", "malware", "trojan", "backdoor", "apt", "cve-"],
  medium: ["patch", "update", "advisory", "security update", "disclosure"],
};

// Ad/spam content filter — reject promotional or non-cybersecurity content
export const AD_PATTERNS = [
  /sponsored\s*(content|post|by)/i,
  /\bad(vertisement|vertorial)\b/i,
  /\bpromotion(al)?\b/i,
  /\bbuy\s+now\b/i,
  /\bfree\s+trial\b/i,
  /\bsubscribe\s+(now|today)\b/i,
  /\bdownload\s+(our|the|free)\s+(e-?book|whitepaper|guide)\b/i,
  /\bsign\s+up\s+for\s+(our|the|a|free)\b/i,
  /\bdiscount\s+(code|offer)\b/i,
  /\bcoupon\b/i,
  /\bpromo\s*code\b/i,
  /\blimited\s+time\s+offer\b/i,
  /\bspecial\s+offer\b/i,
  /\baffiliate\b/i,
  /\bwebinar\s+registration\b/i,
  /\bjoin\s+(our|the)\s+newsletter\b/i,
  /\bpress\s+release\b/i,
  /\bpartner\s+content\b/i,
  // Event promotions / conferences
  /\bregister\s+(now|today|here|for)\b/i,
  /\bearly\s*bird\s*(pricing|discount|rate|registration)?\b/i,
  /\bsave\s+(your|a)\s+spot\b/i,
  /\bbooth\s*#?\d/i,
  /\bexhibitor\b/i,
  /\bcall\s+for\s+(papers|speakers|submissions)\b/i,
  /\buse\s+code\b/i,
  /\b\d+%\s+off\b/i,
  // Product / vendor promos
  /\brequest\s+a?\s*demo\b/i,
  /\bget\s+started\s+(for\s+)?free\b/i,
  /\bschedule\s+a\s+(call|meeting|demo)\b/i,
  /\bbook\s+a\s+(call|meeting|demo|consultation)\b/i,
  /\btry\s+(it\s+)?free\b/i,
  /\bstart\s+your\s+free\b/i,
  /\bno\s+credit\s+card\s+required\b/i,
];

// Known event/conference names that are typically promotional when standalone
export const EVENT_TITLE_PATTERNS = [
  /^black\s*hat\b/i,
  /^def\s*con\b/i,
  /^rsa\s+conference\b/i,
  /^infosec\s*(world|europe|usa)\b/i,
  /^gartner\s+(security|it)\b/i,
  /^s4\s+(events?|conference)\b/i,
  /^cyber\s*(week|summit|expo)\b/i,
  /^hack\s*in\s*the\s*box\b/i,
];

export const CYBERSEC_KEYWORDS = [
  "vulnerability", "exploit", "malware", "ransomware", "phishing",
  "breach", "hack", "threat", "security", "cve-", "zero-day",
  "patch", "cyber", "attack", "backdoor", "trojan", "apt",
  "encryption", "firewall", "incident", "forensic", "credential",
  "botnet", "ddos", "spyware", "rootkit", "privilege escalation",
  "authentication", "authorization", "injection", "xss", "csrf",
];

export function isAdContent(title: string, content: string): boolean {
  const combined = `${title} ${content}`;
  const titleTrimmed = title.trim();

  // 1. Check if title matches known event/conference promo pattern
  //    These are promotional when the title IS the event name (no vulnerability/attack context)
  if (EVENT_TITLE_PATTERNS.some(p => p.test(titleTrimmed))) {
    const lower = combined.toLowerCase();
    const hasNewsContext = /\b(vulnerabilit|exploit|malware|breach|hack|attack|flaw|patch|cve-|ransomware|phishing|backdoor|apt\d|zero.?day)\b/i.test(lower);
    if (!hasNewsContext) return true;
  }

  // 2. Check for ad patterns
  const adScore = AD_PATTERNS.reduce((score, pattern) => {
    return score + (pattern.test(combined) ? 1 : 0);
  }, 0);

  // 3. Check for cybersec relevance
  const lower = combined.toLowerCase();
  const hasCybersecKeyword = CYBERSEC_KEYWORDS.some(kw => lower.includes(kw));

  // Reject if 2+ ad patterns detected and no cybersec keywords
  if (adScore >= 2 && !hasCybersecKeyword) return true;

  // Reject if 3+ ad patterns even with cybersec keywords (heavy promo)
  if (adScore >= 3) return true;

  // 4. Reject very short content that looks like a teaser/ad
  if (content.length < 50 && adScore >= 1) return true;

  // 5. Reject title-only articles with no meaningful content (likely ads/teasers)
  if (titleTrimmed.length > 0 && content.trim().length < 20 && !hasCybersecKeyword) return true;

  return false;
}

// Normalize title for dedup comparison
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifySeverity(text: string): string {
  const lower = text.toLowerCase();
  for (const [severity, keywords] of Object.entries(SEVERITY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return severity;
    }
  }
  return "low";
}

export function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  if (!match) return "";
  const cdata = match[1].match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return (cdata ? cdata[1] : match[1]).trim();
}

export function extractMediaUrl(itemXml: string): string {
  const mediaMatch = itemXml.match(/<media:content[^>]+url="([^"]+)"/i);
  if (mediaMatch) return mediaMatch[1];
  const enclosureMatch = itemXml.match(/<enclosure[^>]+url="([^"]+)"/i);
  if (enclosureMatch) return enclosureMatch[1];
  const imgMatch = itemXml.match(/<img[^>]+src="([^"]+)"/i);
  if (imgMatch) return imgMatch[1];
  return "";
}

export interface FeedItem {
  title: string;
  content: string;
  link: string;
  author: string;
  pubDate: string;
  imageUrl: string;
}

export function parseRSSItems(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const content =
      extractTag(block, "content:encoded") ||
      extractTag(block, "content") ||
      extractTag(block, "description") ||
      extractTag(block, "summary");

    let link = extractTag(block, "link");
    if (!link) {
      const linkHref = block.match(/<link[^>]+href="([^"]+)"/i);
      if (linkHref) link = linkHref[1];
    }

    const author =
      extractTag(block, "author") ||
      extractTag(block, "dc:creator") ||
      "";

    const pubDate =
      extractTag(block, "pubDate") ||
      extractTag(block, "published") ||
      extractTag(block, "updated") ||
      "";

    const imageUrl = extractMediaUrl(block);

    if (title && link) {
      items.push({ title, content, link, author, pubDate, imageUrl });
    }
  }

  return items;
}

// Strip HTML tags and clean up text
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
