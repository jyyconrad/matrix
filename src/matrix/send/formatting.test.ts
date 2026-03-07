import { describe, expect, it, vi } from "vitest";
import { buildMentionHtml, applyMatrixFormatting, convertLocalPathsToOnlineUrls } from "./formatting.js";
import type { MatrixFormattedContent, MatrixMention } from "./types.js";

vi.mock("../format.js", () => ({
  markdownToMatrixHtml: vi.fn((text) => text ? `<p>${text}</p>` : ""),
}));

describe("formatting utilities", () => {
  describe("buildMentionHtml", () => {
    it("generates correct HTML with just userId", () => {
      const html = buildMentionHtml("@user:example.org");
      expect(html).toBe('<a href="https://matrix.to/#/%40user%3Aexample.org">@user:example.org</a>');
    });

    it("generates correct HTML with displayName", () => {
      const html = buildMentionHtml("@user:example.org", "John Doe");
      expect(html).toBe('<a href="https://matrix.to/#/%40user%3Aexample.org">John Doe</a>');
    });

    it("properly encodes special characters in userId", () => {
      const html = buildMentionHtml("@user name:example.org");
      expect(html).toBe('<a href="https://matrix.to/#/%40user%20name%3Aexample.org">@user name:example.org</a>');
    });
  });

  describe("applyMatrixFormatting", () => {
    it("adds formatted body when markdown is provided", () => {
      const content: MatrixFormattedContent = {
        msgtype: "m.text",
        body: "Hello world",
      };

      applyMatrixFormatting(content, "Hello world");

      expect(content.format).toBe("org.matrix.custom.html");
      expect(content.formatted_body).toBe("<p>Hello world</p>");
    });

    it("does not add formatted body when markdown is empty", () => {
      const content: MatrixFormattedContent = {
        msgtype: "m.text",
        body: "",
      };

      applyMatrixFormatting(content, "");

      expect(content.format).toBeUndefined();
      expect(content.formatted_body).toBeUndefined();
    });

    it("appends mentions to formatted body when provided", () => {
      const content: MatrixFormattedContent = {
        msgtype: "m.text",
        body: "Hello",
      };

      const mentions: MatrixMention[] = [
        { userId: "@user1:example.org", displayName: "User 1" },
        { userId: "@user2:example.org" },
      ];

      applyMatrixFormatting(content, "Hello", mentions);

      expect(content.formatted_body).toBe(
        '<p>Hello</p> <a href="https://matrix.to/#/%40user1%3Aexample.org">User 1</a> <a href="https://matrix.to/#/%40user2%3Aexample.org">@user2:example.org</a>'
      );
    });

    it("does not append mentions when mentions array is empty", () => {
      const content: MatrixFormattedContent = {
        msgtype: "m.text",
        body: "Hello",
      };

      applyMatrixFormatting(content, "Hello", []);

      expect(content.formatted_body).toBe("<p>Hello</p>");
    });
  });

  describe("convertLocalPathsToOnlineUrls", () => {
    it("converts workspace tech research paths to online URLs", () => {
      const text = "Check /root/.openclaw/workspace/tech-research/ai-trends.md for details";
      const result = convertLocalPathsToOnlineUrls(text);
      expect(result).toBe("Check [查看](https://www.jzhix.com/docs/view/技术研究/ai-trends.md) for details");
    });

    it("converts multiple paths in one text", () => {
      const text = `
        Tech: /root/.openclaw/workspace/tech-research/ai-trends.md
        Market: /root/.openclaw/workspace/market-research/saas-report.md
      `;
      const result = convertLocalPathsToOnlineUrls(text);
      expect(result).toContain("[查看](https://www.jzhix.com/docs/view/技术研究/ai-trends.md)");
      expect(result).toContain("[查看](https://www.jzhix.com/docs/view/市场调研/saas-report.md)");
    });

    it("returns original text when no paths match", () => {
      const text = "Hello world https://example.com";
      const result = convertLocalPathsToOnlineUrls(text);
      expect(result).toBe(text);
    });

    it("handles non-string input gracefully", () => {
      // @ts-expect-error Testing non-string input
      expect(convertLocalPathsToOnlineUrls(null)).toBeNull();
      // @ts-expect-error Testing non-string input
      expect(convertLocalPathsToOnlineUrls(undefined)).toBeUndefined();
      // @ts-expect-error Testing non-string input
      expect(convertLocalPathsToOnlineUrls(123)).toBe(123);
    });
  });
});
