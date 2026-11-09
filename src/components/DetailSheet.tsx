import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, X } from "lucide-react";
import { useContext } from "react";
import { Entry, hostOf, https, KINDS, PLATFORM_NAME, platformsOf } from "../data/catalog";
import { DownloadButton, Ext } from "./cards";
import { AppIcon, Art, CopyCommand } from "./primitives";
import { UploadCtx } from "./Upload";

function Fact({ k, v }: { k: string; v?: string }) {
  return v ? <div><dt>{k}</dt><dd>{v}</dd></div> : null;
}

export function DetailSheet({ open, entry, onClose }: { open: boolean; entry?: Entry; onClose: () => void }) {
  const upload = useContext(UploadCtx);
  const plats = entry ? platformsOf(entry).map((p) => PLATFORM_NAME[p]).join("、") : "";
  const url = https(entry?.url);
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="sheet-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.aside className="sheet" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 340, damping: 36 }}>
                <Dialog.Close className="sheet-x" aria-label="关闭详情"><X size={18} /></Dialog.Close>
                {!entry ? (
                  <div className="sheet-body">
                    <Dialog.Title>没有找到这个条目</Dialog.Title>
                  </div>
                ) : (
                  <>
                    {entry.kind === "app"
                      ? <div className="sheet-icon"><AppIcon seed={entry.id} title={entry.title} /></div>
                      : <div className="sheet-cover"><Art seed={entry.id} /></div>}
                    <div className="sheet-body">
                      <span className="sheet-kind">{KINDS[entry.kind].label}</span>
                      <Dialog.Title>{entry.title}</Dialog.Title>
                      <p className="sheet-text">{entry.description || entry.summary}</p>
                      <div className="acts">
                        {entry.kind === "workbench" && url && <Ext href={url} primary>打开 {hostOf(url)} <ArrowUpRight size={15} aria-hidden="true" /></Ext>}
                        {entry.kind === "app" && <DownloadButton e={entry} />}
                        <Ext href={entry.repoUrl}>查看仓库 <ArrowUpRight size={15} aria-hidden="true" /></Ext>
                      </div>
                      {entry.install && <><h3>安装</h3><CopyCommand text={entry.install} /></>}
                      {(entry.assets || []).length > 0 && (
                        <>
                          <h3>安装包</h3>
                          <ul className="assets">
                            {entry.assets!.map((a) => (
                              <li key={a.url + a.platform + a.arch}>
                                <a href={https(a.url)} rel="noopener">{PLATFORM_NAME[a.platform]}{a.arch ? ` ${a.arch}` : ""}</a>
                                {a.size && <span>{a.size}</span>}
                                {a.sha256 && <code title={a.sha256}>SHA-256 {a.sha256.slice(0, 12)}…</code>}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      <dl className="facts">
                        <Fact k="作者" v={entry.author} />
                        <Fact k="版本" v={entry.version} />
                        <Fact k="适用系统" v={plats} />
                        <Fact k="运行环境" v={entry.host} />
                        <Fact k="更新时间" v={entry.updatedAt} />
                      </dl>
                      {entry.tags?.length ? <div className="tags">{entry.tags.map((t) => <span key={t}>{t}</span>)}</div> : null}
                      <button type="button" className="quiet" onClick={() => { const e = entry; onClose(); upload({ entry: e }); }}>更新</button>
                    </div>
                  </>
                )}
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
