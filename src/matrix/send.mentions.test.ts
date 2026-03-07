import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";
import { setMatrixRuntime } from "../runtime.js";
import type { PluginRuntime } from "openclaw/plugin-sdk";

vi.mock("music-metadata", () => ({
  parseBuffer: vi.fn().mockResolvedValue({ format: {} }),
}));

vi.mock("@vector-im/matrix-bot-sdk", () => ({
  ConsoleLogger: class {
    trace = vi.fn();
    debug = vi.fn();
    info = vi.fn();
    warn = vi.fn();
    error = vi.fn();
  },
  LogService: {
    setLogger: vi.fn(),
  },
  MatrixClient: vi.fn(),
  SimpleFsStorageProvider: vi.fn(),
  RustSdkCryptoStorageProvider: vi.fn(),
}));

const runtimeStub = {
  config: {
    loadConfig: () => ({}),
  },
  media: {
    loadWebMedia: vi.fn().mockResolvedValue({
      buffer: Buffer.from("media"),
      fileName: "photo.png",
      contentType: "image/png",
      kind: "image",
    }),
    mediaKindFromMime: vi.fn(() => "image"),
    isVoiceCompatibleAudio: vi.fn(() => false),
    getImageMetadata: vi.fn().mockResolvedValue(null),
    resizeToJpeg: vi.fn(),
  },
  channel: {
    text: {
      resolveTextChunkLimit: () => 4000,
      resolveChunkMode: () => "length",
      chunkMarkdownTextWithMode: (text: string) => (text ? [text] : []),
      resolveMarkdownTableMode: () => "code",
      convertMarkdownTables: (text: string) => text,
    },
  },
} as unknown as PluginRuntime;

let sendMessageMatrix: typeof import("./send.js").sendMessageMatrix;

const makeClient = () => {
  const sendMessage = vi.fn().mockResolvedValue("evt1");
  const uploadContent = vi.fn().mockResolvedValue("mxc://example/file");
  const client = {
    sendMessage,
    uploadContent,
    getUserId: vi.fn().mockResolvedValue("@bot:example.org"),
  } as unknown as import("@vector-im/matrix-bot-sdk").MatrixClient;
  return { client, sendMessage, uploadContent };
};

beforeAll(async () => {
  setMatrixRuntime(runtimeStub);
  ({ sendMessageMatrix } = await import("./send.js"));
});

describe("sendMessageMatrix mentions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMatrixRuntime(runtimeStub);
  });

  it("adds mentions to message content and m.mentions field", async () => {
    const { client, sendMessage } = makeClient();

    await sendMessageMatrix("room:!room:example", "Hello everyone", {
      client,
      mentions: [
        { userId: "@user1:example.org", displayName: "User 1" },
        { userId: "@user2:example.org" },
      ],
    });

    const content = sendMessage.mock.calls[0]?.[1] as any;
    expect(content.formatted_body).toContain('<a href="https://matrix.to/#/%40user1%3Aexample.org">User 1</a>');
    expect(content.formatted_body).toContain('<a href="https://matrix.to/#/%40user2%3Aexample.org">@user2:example.org</a>');
    expect(content["m.mentions"]).toEqual({
      user_ids: ["@user1:example.org", "@user2:example.org"],
    });
  });

  it("works with single mention", async () => {
    const { client, sendMessage } = makeClient();

    await sendMessageMatrix("room:!room:example", "Hello", {
      client,
      mentions: [{ userId: "@user:example.org" }],
    });

    const content = sendMessage.mock.calls[0]?.[1] as any;
    expect(content.formatted_body).toContain('<a href="https://matrix.to/#/%40user%3Aexample.org">@user:example.org</a>');
    expect(content["m.mentions"].user_ids).toEqual(["@user:example.org"]);
  });

  it("does not add mentions when mentions array is empty", async () => {
    const { client, sendMessage } = makeClient();

    await sendMessageMatrix("room:!room:example", "Hello", {
      client,
      mentions: [],
    });

    const content = sendMessage.mock.calls[0]?.[1] as any;
    expect(content.formatted_body).toBe("<p>Hello</p>");
    expect(content["m.mentions"]).toBeUndefined();
  });

  it("maintains backward compatibility when mentions is not provided", async () => {
    const { client, sendMessage } = makeClient();

    await sendMessageMatrix("room:!room:example", "Hello", {
      client,
    });

    const content = sendMessage.mock.calls[0]?.[1] as any;
    expect(content.formatted_body).toBe("<p>Hello</p>");
    expect(content["m.mentions"]).toBeUndefined();
  });

  it("properly encodes special characters in user IDs", async () => {
    const { client, sendMessage } = makeClient();

    await sendMessageMatrix("room:!room:example", "Hello", {
      client,
      mentions: [{ userId: "@user name:example.org" }],
    });

    const content = sendMessage.mock.calls[0]?.[1] as any;
    expect(content.formatted_body).toContain('href="https://matrix.to/#/%40user%20name%3Aexample.org"');
  });
});
