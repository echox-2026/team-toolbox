export type Kind = "workbench" | "app" | "plugin" | "blog";
export type Platform = "windows" | "linux" | "macos";

export interface Asset {
  platform: Platform;
  arch?: string;
  url: string;
  size?: string;
  sha256?: string;
}

export interface Entry {
  id: string;
  kind: Kind;
  title: string;
  summary: string;
  description?: string;
  author?: string;
  updatedAt?: string;
  repoUrl?: string;
  tags?: string[];
  /** 工作台和博客：访问地址 */
  url?: string;
  /** 原生应用 */
  version?: string;
  releaseUrl?: string;
  platforms?: Platform[];
  assets?: Asset[];
  /** Skill 与插件：运行在什么环境里，以及安装命令 */
  host?: string;
  install?: string;
  /** 直接上传的 Skill 文件，相对网站根目录 */
  skillFile?: string;
  /** 封面图片，相对后端地址 */
  cover?: string;
}

export const REPO = "https://github.com/echox-2026/team-toolbox";

export const KINDS: Record<Kind, { label: string; short: string }> = {
  workbench: { label: "工作台", short: "工作台" },
  app: { label: "原生应用", short: "应用" },
  plugin: { label: "Skill 与插件", short: "插件" },
  blog: { label: "博客", short: "博客" },
};

export const PLATFORM_NAME: Record<Platform, string> = { windows: "Windows", linux: "Linux", macos: "macOS" };
export const ALL_PLATFORMS: Platform[] = ["windows", "linux", "macos"];

export function https(u: unknown): string {
  if (typeof u !== "string" || !u) return "";
  try {
    const p = new URL(u);
    return p.protocol === "https:" ? p.href : "";
  } catch {
    return "";
  }
}

export function hostOf(u?: string): string {
  try {
    return new URL(u || "").host;
  } catch {
    return "";
  }
}

export const validSkillFile = (f?: string) => /^skills\/[a-z0-9-]+\.md$/.test(f || "");

export function githubRepo(v: string) {
  return /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+?(?:\.git)?\/?$/.test(v);
}

export const UPLOAD_API: string = import.meta.env.MODE === "production" ? "https://echox-upload.echox-2026.workers.dev" : "";

/** Skill 文件和封面存在后端，演示数据没有后端时保持相对路径 */
export const apiHref = (f?: string) => (UPLOAD_API ? `${UPLOAD_API}/${f}` : f || "");

export function clean(list: unknown): Entry[] {
  if (!Array.isArray(list)) return [];
  const validCover = (c?: string) => !c || /^covers\/e-[a-z0-9]{12}\.jpg\?v=[a-f0-9]{8}$/.test(c);
  return (list as Entry[])
    .filter(
      (e) =>
        e &&
        /^[a-z0-9-]{1,64}$/.test(e.id || "") &&
        !!KINDS[e.kind] &&
        !!e.title &&
        !!e.summary &&
        validCover(e.cover) &&
        (e.kind === "blog" ? !!https(e.url) : !!https(e.repoUrl) || validSkillFile(e.skillFile)),
    )
    .map((e) => ({ ...e, assets: (e.assets || []).filter((a) => https(a.url) && PLATFORM_NAME[a.platform]) }));
}

export function platformsOf(e: Entry): Platform[] {
  const s = new Set<Platform>([...(e.assets || []).map((a) => a.platform), ...(e.platforms || [])]);
  return ALL_PLATFORMS.filter((p) => s.has(p));
}

export function detectPlatform(): Platform | null {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad/i.test(ua)) return null;
  if (/Windows/i.test(ua)) return "windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macos";
  if (/Linux/i.test(ua)) return "linux";
  return null;
}

/* demo.ts 只存在于本地，公开仓库里没有这个文件，正式构建不会包含示例内容 */
const demoFiles = import.meta.env.VITE_ECHOX_DEMO === "1" ? import.meta.glob<{ DEMO: unknown }>("./demo.ts") : {};
const loadDemo = demoFiles["./demo.ts"];
export const DEMO: Entry[] | null = loadDemo ? clean((await loadDemo()).DEMO) : null;
