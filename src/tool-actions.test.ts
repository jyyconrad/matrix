import { describe, expect, it, vi } from "vitest";
import { handleMatrixAction } from "./tool-actions.js";

vi.mock("./matrix/actions.js", () => ({
  sendMatrixMessage: vi.fn().mockResolvedValue({ messageId: "evt1", roomId: "!room:example.org" }),
}));

describe("handleMatrixAction sendMessage", () => {
  it("passes mentions parameter to sendMatrixMessage", async () => {
    const result = await handleMatrixAction(
      {
        action: "sendMessage",
        to: "!room:example.org",
        content: "Hello",
        mentions: [
          { userId: "@user1:example.org", displayName: "User 1" },
          { userId: "@user2:example.org" },
        ],
      },
      {} as any
    );

    const { sendMatrixMessage } = await import("./matrix/actions.js");
    expect(sendMatrixMessage).toHaveBeenCalledWith(
      "!room:example.org",
      "Hello",
      expect.objectContaining({
        mentions: [
          { userId: "@user1:example.org", displayName: "User 1" },
          { userId: "@user2:example.org" },
        ],
      })
    );

    expect(result).toBeDefined();
  });

  it("works without mentions parameter", async () => {
    const result = await handleMatrixAction(
      {
        action: "sendMessage",
        to: "!room:example.org",
        content: "Hello",
      },
      {} as any
    );

    const { sendMatrixMessage } = await import("./matrix/actions.js");
    expect(sendMatrixMessage).toHaveBeenCalledWith(
      "!room:example.org",
      "Hello",
      expect.objectContaining({
        mentions: undefined,
      })
    );

    expect(result).toBeDefined();
  });
});
