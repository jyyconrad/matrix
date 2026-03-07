import { describe, expect, it, vi } from "vitest";
import { matrixMessageActions } from "./actions.js";
import type { ChannelMessageActionContext } from "openclaw/plugin-sdk";

vi.mock("./tool-actions.js", () => ({
  handleMatrixAction: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("./matrix/accounts.js", () => ({
  resolveMatrixAccount: vi.fn(() => ({ enabled: true, configured: true })),
}));

describe("matrixMessageActions", () => {
  describe("handleAction send", () => {
    it("parses mentions parameter as JSON when provided", async () => {
      const ctx = {
        action: "send",
        params: {
          to: "!room:example.org",
          message: "Hello",
          mentions: JSON.stringify([
            { userId: "@user1:example.org", displayName: "User 1" },
            { userId: "@user2:example.org" },
          ]),
        },
        cfg: {},
      } as unknown as ChannelMessageActionContext;

      await matrixMessageActions.handleAction(ctx);

      const { handleMatrixAction } = await import("./tool-actions.js");
      expect(handleMatrixAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "sendMessage",
          mentions: [
            { userId: "@user1:example.org", displayName: "User 1" },
            { userId: "@user2:example.org" },
          ],
        }),
        expect.anything()
      );
    });

    it("passes undefined for mentions when not provided", async () => {
      const ctx = {
        action: "send",
        params: {
          to: "!room:example.org",
          message: "Hello",
        },
        cfg: {},
      } as unknown as ChannelMessageActionContext;

      await matrixMessageActions.handleAction(ctx);

      const { handleMatrixAction } = await import("./tool-actions.js");
      expect(handleMatrixAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "sendMessage",
          mentions: undefined,
        }),
        expect.anything()
      );
    });

    it("throws error when mentions is invalid JSON", async () => {
      const ctx = {
        action: "send",
        params: {
          to: "!room:example.org",
          message: "Hello",
          mentions: "invalid-json",
        },
        cfg: {},
      } as unknown as ChannelMessageActionContext;

      await expect(matrixMessageActions.handleAction(ctx)).rejects.toThrow(SyntaxError);
    });
  });
});
