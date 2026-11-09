/* 把一个“[上传]”Issue 校验后写入目录。Issue 内容一律当作数据处理，不进入 shell。 */
import fs from "node:fs";

const DATA = process.env.ECHOX_DATA || "src/data/entries.json";
const NOTE = process.env.ECHOX_NOTE || "ingest-note.md";
const KINDS = new Set(["workbench", "app", "plugin"]);
const PLATFORMS = new Set(["windows", "linux", "macos"]);

class Reject extends Error {}
const no = (msg) => { throw new Reject(msg); };

function finish(result, note) {
  fs.writeFileSync(NOTE, note);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `result=${result}\n`);
  console.log(result, note);
}

function text(v, max, label, { multiline = false, required = false } = {}) {
  if (v === undefined || v === null || v === "") {
    if (required) no(`缺少${label}`);
    return undefined;
  }
  if (typeof v !== "string") no(`${label}格式不对`);
  const s = (multiline ? v.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "") : v.replace(/[\u0000-\u001f\u007f]/g, " ")).trim();
  if (!s) { if (required) no(`缺少${label}`); return undefined; }
  if (s.length > max) no(`${label}太长，最多 ${max} 个字`);
  return s;
}

function link(v, label, required = false) {
  const s = text(v, 300, label, { required });
  if (!s) return undefined;
  let u;
  try { u = new URL(s); } catch { no(`${label}不是有效链接`); }
  if (u.protocol !== "https:") no(`${label}必须以 https 开头`);
  if (u.username || u.password) no(`${label}不能包含账号信息`);
  return u.href;
}

function parse(issue) {
  if (issue.user?.type && issue.user.type !== "User") no("只接受个人账号提交");
  const body = issue.body || "";
  if (body.length > 20000) no("内容太长");
  const m = /```json\s*([\s\S]*?)```/.exec(body);
  if (!m) no("没有找到上传内容");
  let raw;
  try { raw = JSON.parse(m[1]); } catch { no("上传内容不是有效的 JSON"); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) no("上传内容格式不对");
  if (!KINDS.has(raw.kind)) no("内容类型不对");

  const e = {
    kind: raw.kind,
    title: text(raw.title, 60, "名称", { required: true }),
    summary: text(raw.summary, 200, "简介", { required: true }),
    description: text(raw.description, 2000, "详细说明", { multiline: true }),
    author: text(raw.author, 40, "作者", { required: true }),
    repoUrl: link(raw.repoUrl, "仓库", true),
  };
  if (raw.tags !== undefined) {
    if (!Array.isArray(raw.tags)) no("标签格式不对");
    e.tags = raw.tags.slice(0, 6).map((t) => text(t, 20, "标签")).filter(Boolean);
  }
  if (raw.kind === "workbench") e.url = link(raw.url, "网页地址", true);
  if (raw.kind === "app") {
    e.version = text(raw.version, 40, "版本");
    e.releaseUrl = link(raw.releaseUrl, "版本页");
    if (raw.assets !== undefined && !Array.isArray(raw.assets)) no("下载链接格式不对");
    e.assets = (raw.assets || []).slice(0, 6).map((a) => {
      if (!a || !PLATFORMS.has(a.platform)) no("下载链接的系统不对");
      return { platform: a.platform, url: link(a.url, "下载链接", true) };
    });
  }
  if (raw.kind === "plugin") {
    e.host = text(raw.host, 40, "运行环境", { required: true });
    e.install = text(raw.install, 300, "安装命令");
  }
  return { entry: JSON.parse(JSON.stringify(e)), wantedId: raw.id };
}

try {
  const issue = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")).issue;
  const { entry, wantedId } = parse(issue);
  const store = JSON.parse(fs.readFileSync(DATA, "utf8"));
  const stamp = { updatedAt: new Date().toISOString().slice(0, 10), submittedBy: issue.user.id, submitter: issue.user.login };
  if (wantedId !== undefined) {
    if (typeof wantedId !== "string" || !/^[a-z0-9-]{1,64}$/.test(wantedId)) no("条目编号不对");
    const i = store.entries.findIndex((x) => x.id === wantedId);
    if (i < 0) no("要更新的条目不存在");
    if (store.entries[i].submittedBy !== issue.user.id) no("只能更新自己上传的条目");
    if (store.entries[i].kind !== entry.kind) no("不能修改条目的类型");
    store.entries[i] = { id: wantedId, ...entry, ...stamp };
    fs.writeFileSync(DATA, JSON.stringify(store, null, 2) + "\n");
    finish("published", `已更新 \`${wantedId}\`，几分钟后在网站上生效。`);
  } else {
    const id = `e-${issue.number}`;
    if (store.entries.some((x) => x.id === id)) no("这个 Issue 已经处理过");
    store.entries.unshift({ id, ...entry, ...stamp });
    fs.writeFileSync(DATA, JSON.stringify(store, null, 2) + "\n");
    finish("published", `已发布为 \`${id}\`，几分钟后在网站上生效。`);
  }
} catch (err) {
  if (err instanceof Reject) finish("rejected", `未发布：${err.message}。`);
  else throw err;
}
