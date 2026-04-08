import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TAG_RULES: Record<string, string[]> = {
  "Ransomware": ["ransomware", "ransom", "lockbit", "blackcat", "clop", "conti", "revil", "darkside"],
  "Phishing": ["phishing", "spear-phishing", "social engineering", "credential harvesting", "bec"],
  "APT": ["apt", "advanced persistent threat", "nation-state", "state-sponsored", "apt28", "apt29", "lazarus", "cozy bear", "fancy bear"],
  "Zero-Day": ["zero-day", "zero day", "0-day", "0day", "unpatched"],
  "Malware": ["malware", "trojan", "worm", "botnet", "spyware", "keylogger", "rootkit", "rat", "infostealer"],
  "Vulnerability": ["vulnerability", "cve-", "exploit", "buffer overflow", "rce", "remote code execution", "sql injection", "xss", "csrf"],
  "Data Breach": ["data breach", "data leak", "exposed data", "stolen data", "compromised data", "data exposure"],
  "DDoS": ["ddos", "denial of service", "distributed denial"],
  "Cloud Security": ["cloud security", "aws", "azure", "gcp", "misconfiguration", "s3 bucket", "cloud breach"],
  "IoT": ["iot", "internet of things", "smart device", "embedded", "firmware"],
  "Supply Chain": ["supply chain", "solarwinds", "dependency", "third-party", "software supply"],
  "Cryptocurrency": ["crypto", "cryptocurrency", "bitcoin", "ethereum", "cryptojacking", "cryptominer", "wallet"],
  "Critical Infrastructure": ["critical infrastructure", "scada", "ics", "industrial control", "power grid", "water treatment"],
  "Healthcare": ["healthcare", "hospital", "medical", "hipaa", "patient data"],
  "Financial": ["financial", "banking", "fintech", "swift", "payment", "credit card"],
};

function autoTag(title: string, content: string): string[] {
  const combined = `${title} ${content}`.toLowerCase();
  const tags: string[] = [];

  for (const [tag, keywords] of Object.entries(TAG_RULES)) {
    if (keywords.some((kw) => combined.includes(kw))) {
      tags.push(tag);
    }
  }

  return tags.slice(0, 5); // Max 5 tags
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { article_id, tag_all } = await request.json();

  if (tag_all) {
    // Auto-tag all untagged articles
    const { data: articles } = await supabase
      .from("articles")
      .select("id, title, content, tags")
      .or("tags.is.null,tags.eq.{}");

    let tagged = 0;
    for (const article of articles ?? []) {
      const tags = autoTag(article.title, article.content);
      if (tags.length > 0) {
        await supabase.from("articles").update({ tags }).eq("id", article.id);
        tagged++;
      }
    }

    return NextResponse.json({ success: true, tagged, total: articles?.length ?? 0 });
  }

  if (!article_id) {
    return NextResponse.json({ error: "article_id or tag_all required" }, { status: 400 });
  }

  const { data: article } = await supabase
    .from("articles")
    .select("title, content")
    .eq("id", article_id)
    .single();

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const tags = autoTag(article.title, article.content);
  const { error } = await supabase.from("articles").update({ tags }).eq("id", article_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, tags });
}
