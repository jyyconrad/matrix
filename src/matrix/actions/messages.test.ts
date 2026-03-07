import { describe, expect, it, vi } from "vitest";
import { sendMatrixMessage } from "./messages.js";

vi.mock("../send.js", () => ({
  sendMessageMatrix: vi.fn().mockResolvedValue({ messageId: "evt1", roomId: "!room:example.org" }),
  resolveMatrixRoomId: vi.fn().mockResolvedValue("!room:example.org"),
}));

describe("sendMatrixMessage", () => {
  it("passes mentions parameter to sendMessageMatrix", async () => {
    const result = await sendMatrixMessage("!room:example.org", "Hello", {
      mentions: [
        { userId: "@user1:example.org", displayName: "User 1" },
        { userId: "@user2:example.org" },
      ],
    });

    const { sendMessageMatrix } = await import("../send.js");
    expect(sendMessageMatrix).toHaveBeenCalledWith(
      "!room:example.org",
      "Hello",
      expect.objectContaining({
        mentions: [
          { userId: "@user1:example.org", displayName: "User 1" },
          { userId: "@user2:example.org" },
        ],
      })
    );

    expect(result).toEqual({ messageId: "evt1", roomId: "!room:example.org" });
  });

  it("works without mentions parameter", async () => {
    const result = await sendMatrixMessage("!room:example.org", "Hello");

    const { sendMessageMatrix } = await import("../send.js");
    expect(sendMessageMatrix).toHaveBeenCalledWith(
      "!room:example.org",
      "Hello",
      expect.objectContaining({
        mentions: undefined,
      })
    );

    expect(result).toEqual({ messageId: "evt1", roomId: "!room:example.org" });
  });
});
