import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { FileText, ImagePlus, X } from "lucide-react";
import { createContext, DragEvent, useEffect, useRef, useState } from "react";
import { githubRepo, https, KINDS, Kind, UPLOAD_API } from "../data/catalog";
import { Segmented } from "./primitives";

export interface UploadRequest { kind?: Kind; uploader?: string }
export const UploadCtx = createContext<(r?: UploadRequest) => void>(() => {});

const MD_LIMIT = 40 * 1024;
const COVER_W = 640;
const COVER_H = 440;
const COVER_MAX = 270000;

/** 居中裁剪并压缩成统一尺寸的 JPEG，原图不离开浏览器 */
async function compressCover(file: File) {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = COVER_W;
  canvas.height = COVER_H;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#fff";
  c.fillRect(0, 0, COVER_W, COVER_H);
  const scale = Math.max(COVER_W / bmp.width, COVER_H / bmp.height);
  const w = bmp.width * scale, h = bmp.height * scale;
  c.drawImage(bmp, (COVER_W - w) / 2, (COVER_H - h) / 2, w, h);
  bmp.close();
  for (const q of [0.84, 0.7, 0.55, 0.4]) {
    const url = canvas.toDataURL("image/jpeg", q);
    const base64 = url.slice(url.indexOf(",") + 1);
    if (base64.length <= COVER_MAX) return { url, base64 };
  }
  throw new Error("too large");
}
type Phase = "idle" | "sending" | "done";

export function UploadDialog({ open, request, onClose, onDone }: { open: boolean; request?: UploadRequest; onClose: () => void; onDone: () => void }) {
  const [kind, setKind] = useState<Kind>("workbench");
  const [uploader, setUploader] = useState("");
  const [repo, setRepo] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [md, setMd] = useState<{ name: string; text: string } | null>(null);
  const [mdError, setMdError] = useState("");
  const [over, setOver] = useState(false);
  const [tried, setTried] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [failure, setFailure] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const [cover, setCover] = useState<{ url: string; base64: string } | null>(null);
  const [coverError, setCoverError] = useState("");
  const [coverOver, setCoverOver] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind(request?.kind || "workbench");
    setUploader(request?.uploader || ""); setRepo(""); setLink(""); setNote(""); setMd(null); setMdError("");
    setTried(false); setPhase("idle"); setFailure(""); setCover(null); setCoverError("");
  }, [open, request]);

  const isBlog = kind === "blog";
  const isPlugin = kind === "plugin";
  const useMd = isPlugin && md;

  const errors: Record<string, string> = {};
  if (isBlog) {
    if (!https(link.trim())) errors.link = "需要 https 开头的完整链接";
    if (uploader.trim().length > 40) errors.uploader = "最多 40 个字";
  } else {
    if (!uploader.trim()) errors.uploader = "必填";
    else if (uploader.trim().length > 40) errors.uploader = "最多 40 个字";
    if (!useMd && !githubRepo(repo.trim())) errors.repo = isPlugin ? "填写 GitHub 仓库链接，或拖入 md 文件" : "需要 GitHub 仓库链接";
  }
  if (note.length > 200) errors.note = "最多 200 个字";
  const show = (k: string) => (tried ? errors[k] : undefined);

  async function readFile(file?: File | null) {
    setMdError("");
    if (!file) return;
    if (!/\.(md|markdown)$/i.test(file.name)) { setMdError("只支持 .md 文件"); return; }
    if (file.size > MD_LIMIT) { setMdError("文件不能超过 40 KB"); return; }
    setMd({ name: file.name, text: await file.text() });
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    readFile(e.dataTransfer.files[0]);
  }

  async function readCover(file?: File | null) {
    setCoverError("");
    if (!file) return;
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") { setCoverError("只支持图片文件"); return; }
    if (file.size > 15 * 1024 * 1024) { setCoverError("图片不能超过 15 MB"); return; }
    try { setCover(await compressCover(file)); } catch { setCoverError("这张图片读取失败，换一张试试"); }
  }

  async function submit() {
    setTried(true);
    setFailure("");
    if (Object.keys(errors).length) return;
    if (!UPLOAD_API) { setFailure("上传服务还没有连接"); return; }
    const payload = isBlog
      ? { kind, url: link.trim(), uploader: uploader.trim() || undefined, summary: note.trim() || undefined, cover: cover?.base64 }
      : { kind, uploader: uploader.trim(), summary: note.trim() || undefined, cover: cover?.base64, repoUrl: useMd ? undefined : repo.trim(), skill: useMd ? md : undefined };
    setPhase("sending");
    try {
      const r = await fetch(UPLOAD_API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "上传失败，稍后再试");
      setPhase("done");
      onDone();
    } catch (err) {
      setPhase("idle");
      setFailure(err instanceof TypeError ? "网络连接失败，稍后再试" : (err as Error).message);
    }
  }

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
                  <Dialog.Title>上传</Dialog.Title>
                  <Dialog.Close className="sheet-x static" aria-label="关闭"><X size={18} /></Dialog.Close>
                </div>
                {phase === "done" ? (
                  <>
                    <p className="upload-done">已上传</p>
                    <div className="upload-foot"><button type="button" className="btn primary" onClick={onClose}>完成</button></div>
                  </>
                ) : (
                  <>
                    <Segmented size="sm" label="内容类型" value={kind} onChange={(k) => { setKind(k); setTried(false); setFailure(""); }}
                      items={(Object.keys(KINDS) as Kind[]).map((k) => ({ value: k, label: KINDS[k].short }))} />
                    <div className="fields">
                      {isBlog ? (
                        <>
                          <div className="field">
                            <label htmlFor="up-author">上传人（可选）</label>
                            <input id="up-author" value={uploader} autoComplete="off" aria-invalid={Boolean(show("uploader"))} onChange={(e) => setUploader(e.target.value)} />
                            {show("uploader") && <span className="field-err">{show("uploader")}</span>}
                          </div>
                          <div className="field">
                            <label htmlFor="up-link">链接</label>
                            <input id="up-link" value={link} placeholder="https://" autoComplete="off" aria-invalid={Boolean(show("link"))} onChange={(e) => setLink(e.target.value)} />
                            {show("link") && <span className="field-err">{show("link")}</span>}
                          </div>
                          <div className="field">
                            <label htmlFor="up-note">简介（可选）</label>
                            <textarea id="up-note" rows={3} value={note} aria-invalid={Boolean(show("note"))} onChange={(e) => setNote(e.target.value)} />
                            {show("note") && <span className="field-err">{show("note")}</span>}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="field">
                            <label htmlFor="up-uploader">上传人</label>
                            <input id="up-uploader" value={uploader} autoComplete="off" aria-invalid={Boolean(show("uploader"))} onChange={(e) => setUploader(e.target.value)} />
                            {show("uploader") && <span className="field-err">{show("uploader")}</span>}
                          </div>
                          {!useMd && (
                            <div className="field">
                              <label htmlFor="up-repo">仓库链接</label>
                              <input id="up-repo" value={repo} placeholder="https://github.com/" autoComplete="off" aria-invalid={Boolean(show("repo"))} onChange={(e) => setRepo(e.target.value)} />
                              {show("repo") && <span className="field-err">{show("repo")}</span>}
                            </div>
                          )}
                          {isPlugin && (
                            md ? (
                              <div className="dropped"><FileText size={16} aria-hidden="true" /><span>{md.name}</span><button type="button" aria-label="移除文件" onClick={() => setMd(null)}><X size={15} /></button></div>
                            ) : (
                              <div className={`drop${over ? " over" : ""}`} role="button" tabIndex={0}
                                onClick={() => fileInput.current?.click()}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.current?.click(); } }}
                                onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
                                <FileText size={18} aria-hidden="true" /><span>拖入 md 文件</span>
                                <input ref={fileInput} type="file" accept=".md,.markdown" hidden onChange={(e) => readFile(e.target.files?.[0])} />
                              </div>
                            )
                          )}
                          {mdError && <span className="field-err">{mdError}</span>}
                          <div className="field">
                            <label htmlFor="up-note">简介（可选）</label>
                            <textarea id="up-note" rows={3} value={note} aria-invalid={Boolean(show("note"))} onChange={(e) => setNote(e.target.value)} />
                            {show("note") && <span className="field-err">{show("note")}</span>}
                          </div>
                        </>
                      )}
                      <div className="field">
                        <span className="field-label">封面（可选）</span>
                        {cover ? (
                          <div className="cover-preview"><img src={cover.url} alt="封面预览" /><button type="button" aria-label="移除封面" onClick={() => setCover(null)}><X size={15} /></button></div>
                        ) : (
                          <div className={`drop drop-cover${coverOver ? " over" : ""}`} role="button" tabIndex={0} aria-label="选择封面图片"
                            onClick={() => coverInput.current?.click()}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); coverInput.current?.click(); } }}
                            onDragOver={(e) => { e.preventDefault(); setCoverOver(true); }} onDragLeave={() => setCoverOver(false)}
                            onDrop={(e) => { e.preventDefault(); setCoverOver(false); readCover(e.dataTransfer.files[0]); }}>
                            <ImagePlus size={18} aria-hidden="true" /><span>拖入或选择图片</span>
                            <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => readCover(e.target.files?.[0])} />
                          </div>
                        )}
                        {coverError && <span className="field-err">{coverError}</span>}
                      </div>
                    </div>
                    <div className="upload-foot">
                      {failure && <span className="field-err">{failure}</span>}
                      <button type="button" className="btn primary" disabled={phase === "sending"} onClick={submit}>{phase === "sending" ? "上传中" : "上传"}</button>
                    </div>
                  </>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
