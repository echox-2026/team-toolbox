import { ArrowUpRight, Check, Copy, Download, Plus } from "lucide-react";
import { CSSProperties, useContext, useMemo, useState } from "react";
import { Entry, hostOf, https, KINDS, Kind, PLATFORM_NAME, platformsOf, skillHref } from "../data/catalog";
import { bestAsset } from "./cards";
import { AppIcon, Art } from "./primitives";
import { UploadCtx } from "./Upload";

const COLUMNS = 6;
const UNSIGNED = "未署名";
const TILTS = [-2.6, 2.2, -1.7, 2.8, -2.2, 1.8];

function Face({ e }: { e: Entry }) {
  if (e.kind === "app") return <div className="cart-art app-art"><AppIcon seed={e.id} title={e.title} /></div>;
  if (e.kind === "plugin") {
    return <div className="cart-art term-art"><b>$</b> {e.install || (e.skillFile ? "SKILL.md" : <span className="cursor" aria-hidden="true" />)}</div>;
  }
  if (e.kind === "blog") return <div className="cart-art blog-art"><span>{hostOf(e.url).replace(/^www\./, "")}</span></div>;
  return <div className="cart-art"><Art seed={e.id} /></div>;
}

function subtitle(e: Entry) {
  if (e.kind === "app") return [e.version, platformsOf(e).map((p) => PLATFORM_NAME[p].charAt(0)).join(" ")].filter(Boolean).join(" · ");
  if (e.kind === "plugin") return e.host || "";
  if (e.kind === "blog") return e.summary !== hostOf(e.url) ? e.summary : "";
  return hostOf(e.url);
}

function FootAction({ e }: { e: Entry }) {
  const [copied, setCopied] = useState(false);
  if (e.kind === "plugin" && e.skillFile) {
    return <a href={skillHref(e.skillFile)} download aria-label={`下载 ${e.title}`}><Download size={13} aria-hidden="true" />下载</a>;
  }
  if (e.kind === "plugin" && e.install) {
    return (
      <button type="button" aria-label={`复制 ${e.title} 的安装命令`} onClick={async () => {
        try {
          await navigator.clipboard.writeText(e.install!);
          setCopied(true);
          setTimeout(() => setCopied(false), 1300);
        } catch { /* 剪贴板不可用时，详情页里可以手动选中命令 */ }
      }}>{copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}{copied ? "已复制" : "复制"}</button>
    );
  }
  if ((e.kind === "workbench" || e.kind === "blog") && https(e.url)) {
    return <a href={https(e.url)} rel="noopener" aria-label={`打开 ${e.title}`}>打开 <ArrowUpRight size={13} aria-hidden="true" /></a>;
  }
  if (e.kind === "app") {
    const a = bestAsset(e);
    if (a) return <a href={https(a.url)} rel="noopener" aria-label={`下载 ${e.title} 的 ${PLATFORM_NAME[a.platform]} 版`}><Download size={13} aria-hidden="true" />下载</a>;
    if (https(e.releaseUrl)) return <a href={https(e.releaseUrl)} rel="noopener" aria-label={`查看 ${e.title} 的版本`}>版本 <ArrowUpRight size={13} aria-hidden="true" /></a>;
  }
  return https(e.repoUrl) ? <a href={https(e.repoUrl)} rel="noopener" aria-label={`查看 ${e.title} 的仓库`}>仓库 <ArrowUpRight size={13} aria-hidden="true" /></a> : null;
}

function Cartridge({ e, tilt, onOpen }: { e: Entry; tilt: number; onOpen: (id: string) => void }) {
  const sub = subtitle(e);
  return (
    <div className="cart" style={{ "--tilt": `${tilt}deg` } as CSSProperties}>
      <div className="cart-body">
        <div className="cart-grip" aria-hidden="true" />
        <div className="cart-label">
          <Face e={e} />
          <div className="cart-text">
            <strong>{e.title}</strong>
            {sub && <span>{sub}</span>}
          </div>
        </div>
        <div className="cart-foot">
          <span>{e.updatedAt}</span>
          <FootAction e={e} />
        </div>
      </div>
      <button type="button" className="cart-hit" aria-label={`${e.title}，查看详情`} onClick={() => onOpen(e.id)} />
    </div>
  );
}

function Box({ owner, items, onOpen }: { owner: string; items: Entry[]; onOpen: (id: string) => void }) {
  return (
    <section className="box" aria-label={owner}>
      <div className={`box-row${items.length > COLUMNS ? " many" : ""}`}>
        {items.map((e, i) => <Cartridge key={e.id} e={e} tilt={TILTS[i % TILTS.length]} onOpen={onOpen} />)}
      </div>
      <div className="box-lip" aria-hidden="true"><span>{owner}</span><span>{items.length}</span></div>
    </section>
  );
}

function EmptyBox({ kind }: { kind: Kind }) {
  const upload = useContext(UploadCtx);
  return (
    <section className="box" aria-label={KINDS[kind].label}>
      <div className="box-row">
        {Array.from({ length: COLUMNS }, (_, i) => (
          <button key={i} type="button" className="cart-slot" aria-label={`上传${KINDS[kind].label}`} onClick={() => upload({ kind })}><Plus size={20} aria-hidden="true" /></button>
        ))}
      </div>
      <div className="box-lip" aria-hidden="true"><span>BOX</span><span>0</span></div>
    </section>
  );
}

/** 每位上传者一个盒子，最近有上传的人排在前面 */
export function BoxShelf({ entries, kind, onOpen }: { entries: Entry[]; kind: Kind; onOpen: (id: string) => void }) {
  const boxes = useMemo(() => {
    const byOwner = new Map<string, Entry[]>();
    for (const e of entries) {
      const owner = e.author?.trim() || UNSIGNED;
      byOwner.set(owner, [...(byOwner.get(owner) || []), e]);
    }
    return [...byOwner];
  }, [entries]);

  return (
    <div className="shelf">
      {boxes.length === 0 ? <EmptyBox kind={kind} /> : boxes.map(([owner, items]) => <Box key={owner} owner={owner} items={items} onOpen={onOpen} />)}
    </div>
  );
}
