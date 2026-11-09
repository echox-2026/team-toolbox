import * as Menu from "@radix-ui/react-dropdown-menu";
import { motion } from "motion/react";
import { ArrowUpRight, ChevronDown, Download } from "lucide-react";
import { useMemo } from "react";
import { Asset, detectPlatform, Entry, hostOf, https, PLATFORM_NAME, platformsOf } from "../data/catalog";
import { AppIcon, Art, CopyCommand, trackSpot, useTilt } from "./primitives";

const enter = {
  layout: true,
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.97 },
  transition: { type: "spring", stiffness: 300, damping: 30 },
} as const;

function Meta({ e }: { e: Entry }) {
  const by = [e.author, e.updatedAt].filter(Boolean).join(" · ");
  return by ? <div className="meta">{by}</div> : null;
}
function Tags({ e, max = 4 }: { e: Entry; max?: number }) {
  return e.tags?.length ? <div className="tags">{e.tags.slice(0, max).map((t) => <span key={t}>{t}</span>)}</div> : null;
}
export function Ext({ href, children, primary }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return <a className={`btn${primary ? " primary" : ""}`} href={href} rel="noopener">{children}</a>;
}
function Title({ e, onOpen }: { e: Entry; onOpen: (id: string) => void }) {
  return <h3><button type="button" className="title-btn" onClick={() => onOpen(e.id)}>{e.title}</button></h3>;
}

export function WorkbenchCard({ e, onOpen, featured }: { e: Entry; onOpen: (id: string) => void; featured?: boolean }) {
  const tilt = useTilt(featured ? 2.5 : 4);
  const url = https(e.url);
  return (
    <motion.article {...enter} className={`wb spot${featured ? " feat" : ""}`} style={tilt.style} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}>
      <div className="chrome" aria-hidden="true">
        <i /><i /><i />
        <span className="addr">{hostOf(e.url) || "尚未提供访问地址"}</span>
      </div>
      <div className="wb-cover"><Art seed={e.id} /></div>
      <div className="wb-body">
        <Title e={e} onOpen={onOpen} />
        <p className="sum">{e.summary}</p>
        <Tags e={e} />
        <div className="foot-row">
          <Meta e={e} />
          <div className="acts">
            {url ? <Ext href={url} primary>打开 <ArrowUpRight size={15} aria-hidden="true" /></Ext> : <Ext href={e.repoUrl}>查看仓库</Ext>}
            <button type="button" className="btn ghost" onClick={() => onOpen(e.id)}>详情</button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function assetLabel(a: Asset) {
  return `${PLATFORM_NAME[a.platform]}${a.arch ? ` ${a.arch}` : ""}`;
}

export function DownloadButton({ e }: { e: Entry }) {
  const assets = e.assets || [];
  const best = useMemo(() => {
    const mine = detectPlatform();
    return assets.find((a) => a.platform === mine) || assets[0];
  }, [assets]);
  const release = https(e.releaseUrl);
  if (!best) return release ? <Ext href={release} primary>查看版本 <ArrowUpRight size={15} aria-hidden="true" /></Ext> : <Ext href={e.repoUrl}>查看仓库 <ArrowUpRight size={15} aria-hidden="true" /></Ext>;
  const others = assets.filter((a) => a !== best);
  return (
    <div className="split">
      <a className="btn primary split-main" href={https(best.url)} rel="noopener"><Download size={15} aria-hidden="true" /> 下载 {PLATFORM_NAME[best.platform]} 版</a>
      {others.length > 0 && (
        <Menu.Root modal={false}>
          <Menu.Trigger className="btn primary split-more" aria-label="选择其他系统的安装包"><ChevronDown size={15} /></Menu.Trigger>
          <Menu.Portal>
            <Menu.Content className="menu" align="end" sideOffset={6}>
              {assets.map((a) => (
                <Menu.Item asChild key={a.url + a.platform + a.arch}>
                  <a href={https(a.url)} rel="noopener" className="menu-item"><span>{assetLabel(a)}</span>{a.size && <em>{a.size}</em>}</a>
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      )}
    </div>
  );
}

export function AppCard({ e, onOpen }: { e: Entry; onOpen: (id: string) => void }) {
  const plats = platformsOf(e);
  return (
    <motion.article {...enter} className="app spot" onPointerMove={trackSpot}>
      <AppIcon seed={e.id} title={e.title} />
      <div className="app-main">
        <div className="app-head"><Title e={e} onOpen={onOpen} />{e.version && <span className="ver">{e.version}</span>}</div>
        <p className="sum">{e.summary}</p>
        <div className="plat">{plats.map((p) => <span key={p}>{PLATFORM_NAME[p]}</span>)}</div>
        <div className="foot-row">
          <Meta e={e} />
          <div className="acts"><DownloadButton e={e} /><button type="button" className="btn ghost" onClick={() => onOpen(e.id)}>详情</button></div>
        </div>
      </div>
    </motion.article>
  );
}

export function PluginCard({ e, onOpen }: { e: Entry; onOpen: (id: string) => void }) {
  return (
    <motion.article {...enter} className="plug spot" onPointerMove={trackSpot}>
      <div className="plug-top">{e.host && <span className="host">{e.host}</span>}<Meta e={e} /></div>
      <Title e={e} onOpen={onOpen} />
      <p className="sum">{e.summary}</p>
      <Tags e={e} />
      {e.install ? <CopyCommand text={e.install} /> : null}
      <div className="acts">
        <Ext href={e.repoUrl}>查看仓库 <ArrowUpRight size={15} aria-hidden="true" /></Ext>
        <button type="button" className="btn ghost" onClick={() => onOpen(e.id)}>详情</button>
      </div>
    </motion.article>
  );
}
