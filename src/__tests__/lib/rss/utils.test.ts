import { describe, it, expect } from "vitest";
import {
  isAdContent,
  normalizeTitle,
  classifySeverity,
  extractTag,
  extractMediaUrl,
  parseRSSItems,
  stripHtml,
} from "@/lib/rss/utils";

// ---------------------------------------------------------------------------
// isAdContent
// ---------------------------------------------------------------------------
describe("isAdContent", () => {
  it("rejects event title without cybersec context", () => {
    expect(isAdContent("Black Hat USA 2026", "Join us in Las Vegas")).toBe(true);
  });

  it("rejects DefCon promo", () => {
    expect(isAdContent("DEF CON 34 Registration Open", "Get your badges now")).toBe(true);
  });

  it("allows event title WITH cybersec news context", () => {
    expect(
      isAdContent(
        "Black Hat USA: Critical vulnerability disclosed",
        "A new zero-day exploit was demonstrated at Black Hat"
      )
    ).toBe(false);
  });

  it("rejects 2+ ad patterns without cybersec keywords", () => {
    expect(
      isAdContent(
        "Amazing product launch",
        "Subscribe now and get a free trial of our analytics tool today!"
      )
    ).toBe(true);
  });

  it("rejects 3+ ad patterns even with cybersec keyword", () => {
    expect(
      isAdContent(
        "Security product",
        "Subscribe now, free trial, limited time offer for our vulnerability scanner!"
      )
    ).toBe(true);
  });

  it("rejects short content with single ad pattern", () => {
    expect(isAdContent("Check this out", "Buy now!")).toBe(true);
  });

  it("rejects title-only articles with no content and no cybersec", () => {
    expect(isAdContent("Some random title", "")).toBe(true);
  });

  it("rejects content < 20 chars without cybersec", () => {
    expect(isAdContent("Product Update v2", "Coming soon")).toBe(true);
  });

  it("allows legitimate cybersec news", () => {
    expect(
      isAdContent(
        "Critical zero-day vulnerability found in Apache",
        "Researchers disclosed a remote code execution flaw affecting millions of servers worldwide."
      )
    ).toBe(false);
  });

  it("allows article with 1 ad word but strong cybersec context", () => {
    expect(
      isAdContent(
        "Patch update for critical ransomware vulnerability",
        "Microsoft released a security update to address CVE-2026-1234. Subscribe to our advisory feed for updates."
      )
    ).toBe(false);
  });

  it("allows cybersec article with short but relevant content", () => {
    expect(isAdContent("CVE-2026-5678 Disclosed", "Critical vulnerability in OpenSSL")).toBe(false);
  });

  it("allows normal cybersec article", () => {
    expect(
      isAdContent(
        "New phishing campaign targets healthcare sector",
        "Threat actors are sending credential-harvesting emails to hospital staff."
      )
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalizeTitle
// ---------------------------------------------------------------------------
describe("normalizeTitle", () => {
  it("lowercases and removes special chars", () => {
    expect(normalizeTitle("Hello, World! #2026")).toBe("hello world 2026");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeTitle("  too   many   spaces  ")).toBe("too many spaces");
  });

  it("handles empty string", () => {
    expect(normalizeTitle("")).toBe("");
  });

  it("strips punctuation including hyphens and colons", () => {
    expect(normalizeTitle("CVE-2026-1234: Critical Bug")).toBe("cve20261234 critical bug");
  });
});

// ---------------------------------------------------------------------------
// classifySeverity
// ---------------------------------------------------------------------------
describe("classifySeverity", () => {
  it('returns "critical" for "zero-day"', () => {
    expect(classifySeverity("New zero-day exploit in the wild")).toBe("critical");
  });

  it('returns "critical" for "ransomware"', () => {
    expect(classifySeverity("Ransomware hits major hospital chain")).toBe("critical");
  });

  it('returns "critical" for "breach"', () => {
    expect(classifySeverity("Data breach exposes 10M records")).toBe("critical");
  });

  it('returns "high" for "vulnerability"', () => {
    expect(classifySeverity("New vulnerability found in Linux kernel")).toBe("high");
  });

  it('returns "high" for "malware"', () => {
    expect(classifySeverity("Malware distributed via npm packages")).toBe("high");
  });

  it('returns "medium" for "patch"', () => {
    expect(classifySeverity("Microsoft releases monthly patch")).toBe("medium");
  });

  it('returns "medium" for "advisory"', () => {
    expect(classifySeverity("CISA publishes security advisory")).toBe("medium");
  });

  it('returns "low" for unrelated text', () => {
    expect(classifySeverity("New feature in cloud platform")).toBe("low");
  });

  it("prioritizes critical over high when both keywords present", () => {
    expect(classifySeverity("breach discovered via vulnerability")).toBe("critical");
  });
});

// ---------------------------------------------------------------------------
// stripHtml
// ---------------------------------------------------------------------------
describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<p>Hello <strong>World</strong></p>")).toBe("Hello World");
  });

  it("removes script blocks", () => {
    // The implementation strips <script> blocks then collapses whitespace;
    // no space is inserted between adjacent text nodes.
    expect(stripHtml("Hello<script>alert('xss')</script>World")).toBe("HelloWorld");
  });

  it("removes style blocks", () => {
    // Same as script: no space is injected after the block is removed.
    expect(stripHtml("Hello<style>.red{color:red}</style>World")).toBe("HelloWorld");
  });

  it("decodes HTML entities", () => {
    expect(stripHtml("&amp; &lt; &gt; &quot; &#39;")).toBe('& < > " \'');
  });

  it("replaces &nbsp; with a regular space", () => {
    expect(stripHtml("Hello&nbsp;World")).toBe("Hello World");
  });

  it("collapses extra whitespace between block elements", () => {
    expect(stripHtml("<p>Hello</p>   <p>World</p>")).toBe("Hello World");
  });

  it("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// extractTag
// ---------------------------------------------------------------------------
describe("extractTag", () => {
  it("extracts simple tag content", () => {
    expect(extractTag("<title>Hello World</title>", "title")).toBe("Hello World");
  });

  it("extracts CDATA content, preserving inner HTML", () => {
    expect(
      extractTag(
        "<description><![CDATA[Some <b>HTML</b> content]]></description>",
        "description"
      )
    ).toBe("Some <b>HTML</b> content");
  });

  it("returns empty string for missing tag", () => {
    expect(extractTag("<title>Hello</title>", "author")).toBe("");
  });

  it("handles tags with attributes", () => {
    expect(extractTag('<content type="html">Test Content</content>', "content")).toBe(
      "Test Content"
    );
  });
});

// ---------------------------------------------------------------------------
// extractMediaUrl
// ---------------------------------------------------------------------------
describe("extractMediaUrl", () => {
  it("extracts media:content URL", () => {
    expect(
      extractMediaUrl('<media:content url="https://example.com/image.jpg" />')
    ).toBe("https://example.com/image.jpg");
  });

  it("extracts enclosure URL", () => {
    expect(
      extractMediaUrl(
        '<enclosure url="https://example.com/file.mp3" type="audio/mpeg" />'
      )
    ).toBe("https://example.com/file.mp3");
  });

  it("extracts img src", () => {
    expect(
      extractMediaUrl('<img src="https://example.com/photo.png" />')
    ).toBe("https://example.com/photo.png");
  });

  it("prefers media:content over enclosure when both present", () => {
    const xml = `
      <item>
        <enclosure url="https://example.com/fallback.mp3" type="audio/mpeg" />
        <media:content url="https://example.com/preferred.jpg" medium="image" />
      </item>
    `;
    expect(extractMediaUrl(xml)).toBe("https://example.com/preferred.jpg");
  });

  it("returns empty string when no media present", () => {
    expect(extractMediaUrl("<item><title>No media</title></item>")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// parseRSSItems
// ---------------------------------------------------------------------------
describe("parseRSSItems", () => {
  it("parses standard RSS 2.0 items", () => {
    const xml = `
      <rss version="2.0">
        <channel>
          <item>
            <title>Test Article</title>
            <link>https://example.com/article</link>
            <description>This is the article description.</description>
            <author>Jane Doe</author>
            <pubDate>Wed, 09 Apr 2026 12:00:00 +0000</pubDate>
          </item>
        </channel>
      </rss>
    `;
    const items = parseRSSItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Test Article");
    expect(items[0].link).toBe("https://example.com/article");
    expect(items[0].content).toBe("This is the article description.");
    expect(items[0].author).toBe("Jane Doe");
    expect(items[0].pubDate).toBe("Wed, 09 Apr 2026 12:00:00 +0000");
  });

  it("parses Atom feed entries with <link href> syntax", () => {
    const xml = `
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <title>Atom Article</title>
          <link href="https://example.com/atom-article"/>
          <summary>Atom summary text.</summary>
          <published>2026-04-09T12:00:00Z</published>
        </entry>
      </feed>
    `;
    const items = parseRSSItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Atom Article");
    expect(items[0].link).toBe("https://example.com/atom-article");
    expect(items[0].pubDate).toBe("2026-04-09T12:00:00Z");
  });

  it("prefers content:encoded over description", () => {
    const xml = `
      <rss>
        <channel>
          <item>
            <title>Rich Content</title>
            <link>https://example.com/rich</link>
            <description>Short description.</description>
            <content:encoded><![CDATA[<p>Full rich content here.</p>]]></content:encoded>
          </item>
        </channel>
      </rss>
    `;
    const items = parseRSSItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].content).toBe("<p>Full rich content here.</p>");
  });

  it("skips items without a title", () => {
    const xml = `
      <rss>
        <channel>
          <item>
            <link>https://example.com/no-title</link>
            <description>No title here.</description>
          </item>
        </channel>
      </rss>
    `;
    const items = parseRSSItems(xml);
    expect(items).toHaveLength(0);
  });

  it("skips items without a link", () => {
    const xml = `
      <rss>
        <channel>
          <item>
            <title>No Link Article</title>
            <description>No link here.</description>
          </item>
        </channel>
      </rss>
    `;
    const items = parseRSSItems(xml);
    expect(items).toHaveLength(0);
  });

  it("parses multiple items", () => {
    const xml = `
      <rss>
        <channel>
          <item>
            <title>First Article</title>
            <link>https://example.com/first</link>
            <description>First.</description>
          </item>
          <item>
            <title>Second Article</title>
            <link>https://example.com/second</link>
            <description>Second.</description>
          </item>
        </channel>
      </rss>
    `;
    const items = parseRSSItems(xml);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("First Article");
    expect(items[1].title).toBe("Second Article");
  });

  it("handles CDATA in content field", () => {
    const xml = `
      <rss>
        <channel>
          <item>
            <title>CDATA Article</title>
            <link>https://example.com/cdata</link>
            <description><![CDATA[<p>HTML content inside CDATA.</p>]]></description>
          </item>
        </channel>
      </rss>
    `;
    const items = parseRSSItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].content).toBe("<p>HTML content inside CDATA.</p>");
  });
});
