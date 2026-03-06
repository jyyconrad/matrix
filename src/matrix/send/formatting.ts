import { getMatrixRuntime } from "../../runtime.js";
import { markdownToMatrixHtml } from "../format.js";
  type MatrixMention,
import {
  MsgType,
  RelationType,
  type MatrixFormattedContent,
  type MatrixMediaMsgType,
  type MatrixRelation,
  type MatrixReplyRelation,
  type MatrixTextContent,
  type MatrixThreadRelation,
} from "./types.js";

const getCore = () => getMatrixRuntime();

// ============================================================
// 文档地址自动转换 - MD Publisher 集成
// ============================================================

const WORKSPACE_BASE = '/root/.openclaw/workspace/';
const OPENCLAW_BASE = '/root/.openclaw/';
const ONLINE_BASE = 'https://www.jzhix.com/docs/view/';

/**
 * MD Publisher 目录映射配置
 * 根据 app.py 中的 DOC_DIRECTORIES 配置
 * 注意：online 字段使用中文分类名（MD Publisher 的分类名）
 */
const PATH_MAPPING: Array<{ local: string; online: string; root: string }> = [
  // workspace 目录
  { local: 'tech-research/', online: '技术研究/', root: WORKSPACE_BASE },
  { local: 'market-research/', online: '市场调研/', root: WORKSPACE_BASE },
  { local: 'memory/episodes/', online: '记忆/episodes/', root: WORKSPACE_BASE },
  { local: 'memory/graph/', online: '记忆/graph/', root: WORKSPACE_BASE },
  { local: 'memory/procedures/', online: '记忆/procedures/', root: WORKSPACE_BASE },
  { local: 'memory/vault/', online: '记忆/vault/', root: WORKSPACE_BASE },
  { local: 'projects/', online: '项目文档/', root: WORKSPACE_BASE },
  { local: 'skills/', online: 'Skills/', root: WORKSPACE_BASE },
  { local: 'knowledge-base/', online: '知识库/', root: WORKSPACE_BASE },
  { local: 'learning/', online: '学习记录/', root: WORKSPACE_BASE },
  { local: 'blog/posts/', online: '技术博客/', root: WORKSPACE_BASE },
  { local: 'blog/posts/drafts/', online: '博客草稿/', root: WORKSPACE_BASE },
  { local: 'docs/', online: '共享文档/', root: WORKSPACE_BASE },
  { local: 'ai-monetization/', online: 'AI 变现项目/', root: WORKSPACE_BASE },
  { local: 'archive/', online: '归档/', root: WORKSPACE_BASE },
  
  // openclaw 根目录
  { local: 'workspace-coding/', online: 'Agent 工作区/', root: OPENCLAW_BASE },
  { local: 'workspace-web-novel-writer/', online: '网文作家工作区/', root: OPENCLAW_BASE },
  { local: 'workspace-tech-blog-writer/', online: '技术博客工作区/', root: OPENCLAW_BASE },
  { local: 'agents/', online: 'Agents 配置/', root: OPENCLAW_BASE },
  { local: 'extensions/', online: 'Extensions/', root: OPENCLAW_BASE },
  { local: 'memory/', online: 'OpenClaw Memory/', root: OPENCLAW_BASE },
];

/**
 * 自动转换本地文档路径为 MD Publisher 在线地址
 * 
 * 转换规则:
 * - /root/.openclaw/workspace/tech-research/xxx.md → https://www.jzhix.com/docs/view/技术研究/xxx.md
 * - /root/.openclaw/workspace/market-research/xxx.md → https://www.jzhix.com/docs/view/市场调研/xxx.md
 * 
 * @param text 原始文本
 * @returns 转换后的文本
 */
function convertLocalPathsToOnlineUrls(text: string): string {
  if (!text || typeof text !== 'string') return text;
  
  let result = text;
  
  // 遍历所有映射规则
  for (const mapping of PATH_MAPPING) {
    const fullPathPrefix = mapping.root + mapping.local;
    const regex = new RegExp(
      `${fullPathPrefix.replace(/\//g, '\\/')}([^\\s\\)\\]\\\"']+\\.md)`,
      'g'
    );
    
    result = result.replace(regex, (match, relativePath) => {
      // 构建在线 URL（浏览器会自动 URL 编码中文）
      const onlineUrl = `${ONLINE_BASE}${mapping.online}${relativePath}`;
      // 返回 Markdown 链接格式
      return `[查看](${onlineUrl})`;
    });
  }
  
  return result;
}

// 导出函数供测试使用
export { convertLocalPathsToOnlineUrls };

export function buildTextContent(body: string, relation?: MatrixRelation, mentions?: MatrixMention[]): MatrixTextContent {
  // 先转换文档地址
  const convertedBody = convertLocalPathsToOnlineUrls(body);
  
  const content: MatrixTextContent = relation
    ? {
        msgtype: MsgType.Text,
        body: convertedBody,
        "m.relates_to": relation,
      }
    : {
        msgtype: MsgType.Text,
        body: convertedBody,
      };
  applyMatrixFormatting(content, convertedBody, mentions);
  return content;
}

export function applyMatrixFormatting(content: MatrixFormattedContent, body: string, mentions?: MatrixMention[]): void {
  // 先转换文档地址
  const convertedBody = convertLocalPathsToOnlineUrls(body);
  
  const formatted = markdownToMatrixHtml(convertedBody ?? "");
  if (!formatted) {
    return;
  }
  content.format = "org.matrix.custom.html";
  content.formatted_body = formatted;
  // Add mentions to formatted body if provided
  if (mentions?.length) {
    const mentionHtml = mentions
      .map(m => buildMentionHtml(m.userId, m.displayName))
      .join(" ");
    content.formatted_body += ` ${mentionHtml}`;
  }

}

export function buildReplyRelation(replyToId?: string): MatrixReplyRelation | undefined {
  const trimmed = replyToId?.trim();
  if (!trimmed) {
    return undefined;
  }
  return { "m.in_reply_to": { event_id: trimmed } };
}

export function buildThreadRelation(threadId: string, replyToId?: string): MatrixThreadRelation {
  const trimmed = threadId.trim();
  return {
    rel_type: RelationType.Thread,
    event_id: trimmed,
    is_falling_back: true,
    "m.in_reply_to": { event_id: replyToId?.trim() || trimmed },
  };
}

export function resolveMatrixMsgType(contentType?: string, _fileName?: string): MatrixMediaMsgType {
  const kind = getCore().media.mediaKindFromMime(contentType ?? "");
  switch (kind) {
    case "image":
      return MsgType.Image;
    case "audio":
      return MsgType.Audio;
    case "video":
      return MsgType.Video;
    default:
      return MsgType.File;
  }
}

export function resolveMatrixVoiceDecision(opts: {
  wantsVoice: boolean;
  contentType?: string;
  fileName?: string;
}): { useVoice: boolean } {
  if (!opts.wantsVoice) {
    return { useVoice: false };
  }
  if (isMatrixVoiceCompatibleAudio(opts)) {
    return { useVoice: true };
  }
  return { useVoice: false };
}

function isMatrixVoiceCompatibleAudio(opts: { contentType?: string; fileName?: string }): boolean {
  return getCore().media.isVoiceCompatibleAudio({
    contentType: opts.contentType,
    fileName: opts.fileName,
  });
}

/**
 * Build HTML for a Matrix mention
 * @param userId The Matrix user ID to mention
 * @param displayName Optional display name for the mention
 * @returns HTML string for the mention
 */
export function buildMentionHtml(userId: string, displayName?: string): string {
  const name = displayName || userId;
  const encodedUserId = encodeURIComponent(userId);
  return `<a href="https://matrix.to/#/${encodedUserId}">${name}</a>`;
}
