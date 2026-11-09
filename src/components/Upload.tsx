import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, X } from "lucide-react";
import { createContext, useEffect, useState } from "react";
import { ALL_PLATFORMS, Entry, https, KINDS, Kind, Platform, PLATFORM_NAME, REPO } from "../data/catalog";
import { Segmented } from "./primitives";

export interface UploadRequest { kind?: Kind; entry?: Entry }
export const UploadCtx = createContext<(r?: UploadRequest) => void>(() => {});

type Form = Record<string, string>;
const blank: Form = { title: "", author: "", summary: "", description: "", repoUrl: "", tags: "", url: "", version: "", releaseUrl: "", windows: "", linux: "", macos: "", host: "", install: "" };

function fromEntry(e?: Entry): Form {
  if (!e) return { ...blank };
  const link = (p: Platform) => e.assets?.find((a) => a.platform === p)?.url || "";
  return { ...blank, title: e.title, author: e.author || "", summary: e.summary, description: e.description || "", repoUrl: e.repoUrl, tags: (e.tags || []).join("，"), url: e.url || "", version: e.version || "", releaseUrl: e.releaseUrl || "", windows: link("windows"), linux: link("linux"), macos: link("macos"), host: e.host || "", install: e.install || "" };
}

function validate(kind: Kind, f: Form) {
  const err: Form = {};
  const need = (k: string, max: number) => {
    if (!f[k].trim()) err[k] = "必填";
    else if (f[k].trim().length > max) err[k] = `最多 ${max} 个字`;
  };
  const link = (k: string) => { if (f[k].trim() && !https(f[k].trim())) err[k] = "需要 https 开头的完整链接"; };
  need("title", 60); need("author", 40); need("summary", 200); need("repoUrl", 300);
  ["repoUrl", "releaseUrl", "windows", "linux", "macos"].forEach(link);
  if (f.description.length > 2000) err.description = "最多 2000 个字";
  if (kind === "workbench") { need("url", 300); link("url"); }
  if (kind === "plugin") need("host", 40);
  if (f.install.length > 300) err.install = "最多 300 个字";
  return err;
}

function buildUrl(kind: Kind, f: Form, id?: string) {
  const t = (s: string) => s.trim() || undefined;
  const base = { id, kind, title: t(f.title), summary: t(f.summary), description: t(f.description), author: t(f.author), repoUrl: t(f.repoUrl), tags: f.tags.split(/[,，、\s]+/).filter(Boolean).slice(0, 6) };
  const extra =
    kind === "workbench" ? { url: t(f.url) }
    : kind === "app" ? { version: t(f.version), releaseUrl: t(f.releaseUrl), assets: ALL_PLATFORMS.filter((p) => f[p].trim()).map((p) => ({ platform: p, url: f[p].trim() })) }
    : { host: t(f.host), install: t(f.install) };
  const body = "```json\n" + JSON.stringify({ ...base, ...extra }, null, 2) + "\n```\n";
  return `${REPO}/issues/new?title=${encodeURIComponent(`[上传] ${f.title.trim()}`)}&body=${encodeURIComponent(body)}`;
}

function Field({ name, label, form, set, err, required, textarea, placeholder, wide }: { name: string; label: string; form: Form; set: (k: string, v: string) => void; err: Form; required?: boolean; textarea?: boolean; placeholder?: string; wide?: boolean }) {
  const id = `up-${name}`;
  const props = { id, value: form[name], placeholder, "aria-invalid": Boolean(err[name]), "aria-describedby": err[name] ? `${id}-e` : undefined };
  return (
    <div className={`field${wide ? " wide" : ""}`}>
      <label htmlFor={id}>{label}{required && <i aria-hidden="true"> *</i>}</label>
      {textarea
        ? <textarea rows={3} {...props} onChange={(e) => set(name, e.target.value)} />
        : <input autoComplete="off" {...props} onChange={(e) => set(name, e.target.value)} />}
      {err[name] && <span className="field-err" id={`${id}-e`}>{err[name]}</span>}
    </div>
  );
}

export function UploadDialog({ open, request, onClose }: { open: boolean; request?: UploadRequest; onClose: () => void }) {
  const [kind, setKind] = useState<Kind>("workbench");
  const [form, setForm] = useState<Form>(blank);
  const [tried, setTried] = useState(false);
  const entry = request?.entry;

  useEffect(() => {
    if (!open) return;
    setKind(request?.entry?.kind || request?.kind || "workbench");
    setForm(fromEntry(request?.entry));
    setTried(false);
  }, [open, request]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const errors = validate(kind, form);
  const url = buildUrl(kind, form, entry?.id);
  const tooLong = url.length > 7000;
  const shown = tried ? errors : {};
  const common = { form, set, err: shown };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="sheet-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div className="upload" initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ type: "spring", stiffness: 380, damping: 34 }}>
                <div className="upload-head">
                  <Dialog.Title>{entry ? "更新" : "上传"}</Dialog.Title>
                  <Dialog.Close className="sheet-x static" aria-label="关闭"><X size={18} /></Dialog.Close>
                </div>
                {!entry && (
                  <Segmented size="sm" label="内容类型" value={kind} onChange={setKind}
                    items={(Object.keys(KINDS) as Kind[]).map((k) => ({ value: k, label: KINDS[k].label }))} />
                )}
                <div className="fields">
                  <Field name="title" label="名称" required {...common} />
                  <Field name="author" label="作者" required {...common} />
                  <Field name="summary" label="简介" required wide {...common} />
                  {kind === "workbench" && <Field name="url" label="网页地址" required wide placeholder="https://" {...common} />}
                  {kind === "app" && (
                    <>
                      <Field name="version" label="版本" placeholder="v1.0.0" {...common} />
                      <Field name="releaseUrl" label="版本页" placeholder="https://" {...common} />
                      {ALL_PLATFORMS.map((p) => <Field key={p} name={p} label={`${PLATFORM_NAME[p]} 下载链接`} wide placeholder="https://" {...common} />)}
                    </>
                  )}
                  {kind === "plugin" && (
                    <>
                      <Field name="host" label="运行环境" required placeholder="Claude Code" {...common} />
                      <Field name="install" label="安装命令" {...common} />
                    </>
                  )}
                  <Field name="repoUrl" label="仓库" required wide placeholder="https://github.com/" {...common} />
                  <Field name="tags" label="标签" wide placeholder="用逗号分隔" {...common} />
                  <Field name="description" label="详细说明" wide textarea {...common} />
                </div>
                {tried && tooLong && <p className="field-err">内容太长，请缩短简介或说明。</p>}
                <div className="upload-foot">
                  <span>需要登录 GitHub</span>
                  <a className="btn primary" href={url} target="_blank" rel="noopener"
                    onClick={(e) => {
                      setTried(true);
                      if (Object.keys(errors).length || tooLong) e.preventDefault();
                      else onClose();
                    }}>发布 <ArrowUpRight size={15} aria-hidden="true" /></a>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
