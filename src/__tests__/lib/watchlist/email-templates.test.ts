import { describe, it, expect } from "vitest";
import {
  buildSingleMatchEmail,
  buildDigestEmail,
  type SingleMatchEmailData,
  type DigestEmailData,
} from "@/lib/watchlist/email-templates";

const singleMatchData: SingleMatchEmailData = {
  watchlistName: "Critical Threats",
  article: {
    id: "art-1",
    title: "New ransomware variant targets healthcare sector",
    severity: "critical",
    excerpt: "A new ransomware strain has been discovered targeting hospitals.",
    source_url: "https://example.com/article",
    published_at: "2026-01-15T10:00:00Z",
  },
  matchedKeyword: "ransomware",
  matchedIn: "title",
  summaryTh: "พบ ransomware สายพันธุ์ใหม่โจมตีโรงพยาบาล",
  articleUrl: "https://sentinel-lens.app/articles/art-1",
};

describe("buildSingleMatchEmail", () => {
  it("returns subject with keyword and title", () => {
    const { subject } = buildSingleMatchEmail(singleMatchData);
    expect(subject).toContain("[Sentinel Lens]");
    expect(subject).toContain("ransomware");
    expect(subject).toContain("New ransomware variant");
  });

  it("truncates long title in subject to 60 chars with ellipsis", () => {
    const longTitle = "A".repeat(80);
    const data = { ...singleMatchData, article: { ...singleMatchData.article, title: longTitle } };
    const { subject } = buildSingleMatchEmail(data);
    expect(subject).toContain("…");
  });

  it("does not add ellipsis for short titles", () => {
    const { subject } = buildSingleMatchEmail(singleMatchData);
    expect(subject).not.toContain("…");
  });

  it("returns valid HTML with DOCTYPE and article title", () => {
    const { html } = buildSingleMatchEmail(singleMatchData);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("New ransomware variant targets healthcare sector");
  });

  it("includes severity badge with correct color", () => {
    const { html } = buildSingleMatchEmail(singleMatchData);
    expect(html).toContain("critical");
    expect(html).toContain("#EF4444");
  });

  it("includes Thai summary when provided", () => {
    const { html } = buildSingleMatchEmail(singleMatchData);
    expect(html).toContain("พบ ransomware สายพันธุ์ใหม่โจมตีโรงพยาบาล");
    expect(html).toContain("สรุปภาษาไทย");
  });

  it("omits Thai summary section when summaryTh is null", () => {
    const data = { ...singleMatchData, summaryTh: null };
    const { html } = buildSingleMatchEmail(data);
    expect(html).not.toContain("สรุปภาษาไทย");
  });

  it("includes articleUrl link", () => {
    const { html } = buildSingleMatchEmail(singleMatchData);
    expect(html).toContain("https://sentinel-lens.app/articles/art-1");
    expect(html).toContain("อ่านบทความเต็ม");
  });

  it("falls back to source_url when articleUrl not provided", () => {
    const data = { ...singleMatchData, articleUrl: undefined };
    const { html } = buildSingleMatchEmail(data);
    expect(html).toContain("https://example.com/article");
  });

  it("omits link when neither articleUrl nor source_url available", () => {
    const data = {
      ...singleMatchData,
      articleUrl: undefined,
      article: { ...singleMatchData.article, source_url: null },
    };
    const { html } = buildSingleMatchEmail(data);
    expect(html).not.toContain("อ่านบทความเต็ม");
  });

  it("includes watchlist name and keyword info", () => {
    const { html } = buildSingleMatchEmail(singleMatchData);
    expect(html).toContain("Critical Threats");
    expect(html).toContain("ransomware");
  });

  it("includes Sentinel Lens branding", () => {
    const { html } = buildSingleMatchEmail(singleMatchData);
    expect(html).toContain("Sentinel Lens");
    expect(html).toContain("Cybersecurity Intelligence Platform");
  });
});

describe("buildDigestEmail", () => {
  const digestData: DigestEmailData = {
    watchlistName: "APT Monitor",
    periodLabel: "ช่วง 30 นาทีที่ผ่านมา",
    matches: [
      {
        article: {
          id: "art-1",
          title: "APT29 launches new campaign",
          severity: "high",
          excerpt: "Russian threat group targets government agencies with new toolset.",
          source_url: "https://example.com/1",
          published_at: "2026-01-15T10:00:00Z",
        },
        matchedKeyword: "APT29",
        matchedIn: "title",
        summaryTh: "กลุ่ม APT29 เปิดปฏิบัติการใหม่",
        articleUrl: "https://sentinel-lens.app/articles/art-1",
      },
      {
        article: {
          id: "art-2",
          title: "Zero-day in popular firewall appliance",
          severity: "critical",
          excerpt: "A zero-day vulnerability was found in a widely-deployed firewall.",
          source_url: "https://example.com/2",
          published_at: "2026-01-15T11:00:00Z",
        },
        matchedKeyword: "zero-day",
        matchedIn: "title",
        summaryTh: null,
      },
    ],
  };

  it("returns subject with watchlist name, count, and period", () => {
    const { subject } = buildDigestEmail(digestData);
    expect(subject).toContain("[Sentinel Lens]");
    expect(subject).toContain("APT Monitor");
    expect(subject).toContain("2 รายการใหม่");
    expect(subject).toContain("ช่วง 30 นาทีที่ผ่านมา");
  });

  it("returns valid HTML with all match items", () => {
    const { html } = buildDigestEmail(digestData);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("APT29 launches new campaign");
    expect(html).toContain("Zero-day in popular firewall appliance");
  });

  it("numbers match items", () => {
    const { html } = buildDigestEmail(digestData);
    expect(html).toContain("#1");
    expect(html).toContain("#2");
  });

  it("includes severity badges for each match", () => {
    const { html } = buildDigestEmail(digestData);
    expect(html).toContain("#F97316"); // high
    expect(html).toContain("#EF4444"); // critical
  });

  it("includes Thai summary where provided", () => {
    const { html } = buildDigestEmail(digestData);
    expect(html).toContain("กลุ่ม APT29 เปิดปฏิบัติการใหม่");
  });

  it("handles matches with null summaryTh gracefully", () => {
    const { html } = buildDigestEmail(digestData);
    expect(html).toContain("Zero-day in popular firewall appliance");
  });

  it("truncates long excerpts to 200 chars with ellipsis", () => {
    const longExcerpt = "A".repeat(300);
    const data: DigestEmailData = {
      ...digestData,
      matches: [{
        ...digestData.matches[0],
        article: { ...digestData.matches[0].article, excerpt: longExcerpt },
      }],
    };
    const { html } = buildDigestEmail(data);
    expect(html).toContain("A".repeat(200) + "…");
  });

  it("includes match count in header", () => {
    const { html } = buildDigestEmail(digestData);
    expect(html).toContain("2 รายการ");
  });
});
