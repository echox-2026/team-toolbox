/* 上传后端（Cloudflare Worker + D1）：接收上传、自动补全信息、提供目录。 */
const ORIGINS = new Set(["https://echox-2026.github.io"]);
const MAX_BODY = 400000;
const MAX_COVER_BASE64 = 280000;
const WINDOW_MS = 60000;
const MAX_PER_WINDOW = 8;
const MAX_PER_HOUR = 120;
const hits = new Map();

function cors(origin) {
  return ORIGINS.has(origin)
    ? { "access-control-allow-origin": origin, "access-control-allow-methods": "GET, POST, DELETE, OPTIONS", "access-control-allow-headers": "content-type", vary: "origin" }
    : { vary: "origin" };
}

function limited(ip, now) {
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

class Reject extends Error {}
const no = (msg) => { throw new Reject(msg); };
const clean = (v, max, multiline = false) => {
  if (typeof v !== "string") return undefined;
  const s = (multiline ? v.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "") : v.replace(/[\u0000-\u001f\u007f]/g, " ")).trim();
  return s ? s.slice(0, max) : undefined;
};
const httpsUrl = (v) => {
  try {
    const u = new URL(String(v));
    return u.protocol === "https:" && !u.username && !u.password && String(v).length <= 300 ? u.href : undefined;
  } catch { return undefined; }
};
const githubRepo = (v) => /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(String(v));

async function shortHash(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 6).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function githubApi(env, path) {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise((done) => setTimeout(done, 350));
    const r = await fetch(`https://api.github.com${path}`, {
      headers: { accept: "application/vnd.github+json", "user-agent": "echox-toolbox", ...(env.GITHUB_TOKEN ? { authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}) },
    });
    if (r.status === 404) return { missing: true };
    if (r.ok) return { data: await r.json() };
  }
  return { limited: true };
}

/** 匿名接口被限流时，从仓库网页标题读取简介 */
async function repoFromPage(owner, name) {
  try {
    const r = await fetch(`https://github.com/${owner}/${name}`, { headers: { "user-agent": "echox-toolbox" }, signal: AbortSignal.timeout(8000) });
    if (r.status === 404) return { missing: true };
    const html = (await r.text()).slice(0, 60000);
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || "";
    const description = /^GitHub - [^:]+:\s*(.+)$/.exec(title.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim())?.[1];
    return { data: { name, description, html_url: `https://github.com/${owner}/${name}` } };
  } catch { return {}; }
}

const PLATFORM_BY_EXT = [
  [/\.(exe|msi|msix)$/i, "windows"],
  [/\.(dmg|pkg)$/i, "macos"],
  [/\.(appimage|deb|rpm)$/i, "linux"],
];
function assetsFrom(release) {
  const seen = new Set();
  const out = [];
  for (const a of release?.assets || []) {
    const hit = PLATFORM_BY_EXT.find(([re]) => re.test(a.name));
    if (!hit || seen.has(hit[1]) || !httpsUrl(a.browser_download_url)) continue;
    seen.add(hit[1]);
    out.push({ platform: hit[1], url: a.browser_download_url, size: `${Math.max(1, Math.round(a.size / 1048576))} MB` });
  }
  return out;
}

async function fromRepo(env, kind, repoUrl) {
  const m = githubRepo(repoUrl) || no("需要 GitHub 仓库链接");
  const [, owner, name] = m;
  const canonical = `https://github.com/${owner}/${name}`;
  let res = await githubApi(env, `/repos/${owner}/${name}`);
  if (res.limited) res = await repoFromPage(owner, name);
  if (res.missing) no("仓库不存在或未公开");
  const repo = res.data;
  const e = { kind, title: repo?.name || name, summary: clean(repo?.description, 200) || repo?.name || name, repoUrl: repo?.html_url || canonical, tags: (repo?.topics || []).slice(0, 6) };
  if (kind === "workbench") e.url = httpsUrl(repo?.homepage) || (repo?.has_pages ? `https://${owner.toLowerCase()}.github.io/${name}/` : e.repoUrl);
  if (kind === "app") {
    const rel = await githubApi(env, `/repos/${owner}/${name}/releases/latest`);
    if (rel.data) { e.version = clean(rel.data.tag_name, 40); e.releaseUrl = httpsUrl(rel.data.html_url); e.assets = assetsFrom(rel.data); }
  }
  if (kind === "plugin") { e.host = "Skill"; e.install = `git clone ${e.repoUrl}.git`; }
  return e;
}

function isPublicHost(host) {
  const h = host.toLowerCase();
  return h.includes(".") && !h.endsWith(".local") && !h.endsWith(".internal") && !/^\[|^\d{1,3}(\.\d{1,3}){3}/.test(h);
}

/** 只读取网页开头找标题，读不到时退回域名，不影响收录 */
async function pageTitle(url) {
  const host = new URL(url).host;
  try {
    const r = await fetch(url, { headers: { "user-agent": "echox-toolbox" }, redirect: "follow", signal: AbortSignal.timeout(8000) });
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let html = "";
    while (html.length < 120000 && !/<\/title>/i.test(html)) {
      const { value, done } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
    }
    await reader.cancel().catch(() => {});
    const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
    return clean(t?.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'"), 60) || host;
  } catch { return host; }
}

async function build(p, env) {
  if (!p || typeof p !== "object" || Array.isArray(p)) no("内容格式不对");
  if (typeof p.summary === "string" && p.summary.length > 200) no("简介最多 200 个字");
  const note = clean(p.summary, 200);
  if (p.kind === "blog") {
    const url = httpsUrl(p.url) || no("链接必须以 https 开头");
    if (!isPublicHost(new URL(url).host)) no("链接地址不对");
    if (typeof p.uploader === "string" && p.uploader.length > 40) no("上传人最多 40 个字");
    const author = clean(p.uploader, 40);
    return { key: url, entry: { kind: "blog", title: await pageTitle(url), summary: note || new URL(url).host, url, ...(author ? { author } : {}) } };
  }
  if (!["workbench", "app", "plugin"].includes(p.kind)) no("内容类型不对");
  if (typeof p.uploader === "string" && p.uploader.length > 40) no("上传人最多 40 个字");
  const uploader = clean(p.uploader, 40) || no("请填写上传人");
  if (p.kind === "plugin" && p.skill) {
    const name = clean(p.skill.name, 80) || no("文件名不对");
    if (!/\.(md|markdown)$/i.test(name)) no("只支持 md 文件");
    const text = typeof p.skill.text === "string" ? p.skill.text : no("文件内容不对");
    if (!text.trim() || new TextEncoder().encode(text).length > 40960) no("文件不能为空或超过 40 KB");
    const fm = /^---\n([\s\S]*?)\n---/.exec(text.replace(/\r\n/g, "\n"))?.[1] || "";
    const field = (k, max) => clean(new RegExp(`^${k}:\\s*["']?(.+?)["']?\\s*$`, "m").exec(fm)?.[1], max);
    const h1 = clean(/^#\s+(.+)$/m.exec(text)?.[1], 60);
    return { key: `md:${text}`, skill: { name, text }, entry: { kind: "plugin", title: field("name", 60) || h1 || name.replace(/\.(md|markdown)$/i, ""), summary: note || field("description", 200) || name, host: "Skill", author: uploader } };
  }
  const e = await fromRepo(env, p.kind, p.repoUrl);
  return { key: e.repoUrl.toLowerCase(), entry: { ...e, ...(note ? { summary: note } : {}), author: uploader } };
}

/** 封面由浏览器压缩成 JPEG 后传来，这里核对文件头，只保存真正的 JPEG */
function checkCover(v) {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string" || v.length > MAX_COVER_BASE64) no("封面图片太大");
  let head;
  try { head = atob(v.slice(0, 8)); atob(v); } catch { no("封面图片格式不对"); }
  if (head.charCodeAt(0) !== 0xff || head.charCodeAt(1) !== 0xd8 || head.charCodeAt(2) !== 0xff) no("封面图片格式不对");
  return v;
}

async function upload(env, payload) {
  const now = Date.now();
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM entries WHERE updated_at > ?").bind(now - 3600000).first("n");
  if (recent >= MAX_PER_HOUR) no("现在上传的人太多，稍后再试");
  const cover = checkCover(payload?.cover);
  const { key, entry, skill } = await build(payload, env);
  const id = `e-${await shortHash(key)}`;
  const old = await env.DB.prepare("SELECT json FROM entries WHERE id = ?").bind(id).first("json");
  const previous = old ? JSON.parse(old) : {};
  const author = previous.author;
  const coverPath = cover ? `covers/${id}.jpg?v=${(await shortHash(cover)).slice(0, 8)}` : previous.cover;
  const next = { id, ...entry, ...(author ? { author } : {}), ...(skill ? { skillFile: `skills/${id}.md` } : {}), ...(coverPath ? { cover: coverPath } : {}), updatedAt: new Date(now).toISOString().slice(0, 10) };
  const statements = [
    env.DB.prepare("INSERT INTO entries (id, kind, json, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at").bind(id, next.kind, JSON.stringify(next), now, now),
  ];
  if (skill) statements.push(env.DB.prepare("INSERT OR REPLACE INTO skills (id, name, text) VALUES (?, ?, ?)").bind(id, skill.name, skill.text));
  if (cover) statements.push(env.DB.prepare("INSERT OR REPLACE INTO covers (id, data) VALUES (?, ?)").bind(id, cover));
  await env.DB.batch(statements);
  return next;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "";
    const headers = { ...cors(origin), "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
    const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });
    const { pathname } = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

    if (request.method === "GET" && pathname === "/entries") {
      const { results } = await env.DB.prepare("SELECT json FROM entries ORDER BY updated_at DESC LIMIT 2000").all();
      return reply(200, { entries: results.map((r) => JSON.parse(r.json)) });
    }

    const skill = /^\/skills\/(e-[a-f0-9]{12})\.md$/.exec(pathname);
    if (request.method === "GET" && skill) {
      const row = await env.DB.prepare("SELECT name, text FROM skills WHERE id = ?").bind(skill[1]).first();
      if (!row) return reply(404, { error: "文件不存在" });
      const safe = row.name.replace(/[^\w.-]/g, "_");
      return new Response(row.text, { headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": `attachment; filename="${safe}"`, "x-content-type-options": "nosniff", "cache-control": "public, max-age=60", "access-control-allow-origin": "*" } });
    }

    const coverPath = /^\/covers\/(e-[a-f0-9]{12})\.jpg$/.exec(pathname);
    if (request.method === "GET" && coverPath) {
      const data = await env.DB.prepare("SELECT data FROM covers WHERE id = ?").bind(coverPath[1]).first("data");
      if (!data) return reply(404, { error: "封面不存在" });
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      return new Response(bytes, { headers: { "content-type": "image/jpeg", "x-content-type-options": "nosniff", "cache-control": "public, max-age=31536000, immutable" } });
    }

    const removal = /^\/entries\/(e-[a-f0-9]{12})$/.exec(pathname);
    if (request.method === "DELETE" && removal) {
      if (!ORIGINS.has(origin)) return reply(403, { error: "来源不对" });
      if (limited(request.headers.get("cf-connecting-ip") || "unknown", Date.now())) return reply(429, { error: "太频繁了，稍后再试" });
      const id = removal[1];
      const exists = await env.DB.prepare("SELECT id FROM entries WHERE id = ?").bind(id).first("id");
      if (!exists) return reply(404, { error: "这个条目已经不存在" });
      /* 移进回收表而不是真删：任何人都能删除，误删或恶意删除时还能恢复 */
      await env.DB.batch([
        env.DB.prepare("INSERT OR REPLACE INTO trash (id, kind, json, deleted_at) SELECT id, kind, json, ? FROM entries WHERE id = ?").bind(Date.now(), id),
        env.DB.prepare("DELETE FROM entries WHERE id = ?").bind(id),
      ]);
      return reply(200, { ok: true });
    }

    if (request.method !== "POST" || pathname !== "/") return reply(404, { error: "地址不对" });
    if (!ORIGINS.has(origin)) return reply(403, { error: "来源不对" });
    if (limited(request.headers.get("cf-connecting-ip") || "unknown", Date.now())) return reply(429, { error: "太频繁了，稍后再试" });

    const raw = await request.text();
    if (raw.length > MAX_BODY) return reply(413, { error: "内容太大" });
    let payload;
    try { payload = JSON.parse(raw); } catch { return reply(400, { error: "内容格式不对" }); }

    try {
      return reply(201, { entry: await upload(env, payload) });
    } catch (err) {
      if (err instanceof Reject) return reply(400, { error: err.message });
      console.error(err);
      return reply(500, { error: "上传失败，稍后再试" });
    }
  },
};
