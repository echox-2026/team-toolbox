import * as Menu from "@radix-ui/react-dropdown-menu";
import { ArrowUpRight, ChevronDown, Download } from "lucide-react";
import { Asset, detectPlatform, Entry, https, PLATFORM_NAME } from "../data/catalog";

export function Ext({ href, children, primary }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return <a className={`btn${primary ? " primary" : ""}`} href={href} rel="noopener">{children}</a>;
}

function assetLabel(a: Asset) {
  return `${PLATFORM_NAME[a.platform]}${a.arch ? ` ${a.arch}` : ""}`;
}

/** 优先选访客当前系统的安装包 */
export function bestAsset(e: Entry): Asset | undefined {
  const assets = e.assets || [];
  const mine = detectPlatform();
  return assets.find((a) => a.platform === mine) || assets[0];
}

export function DownloadButton({ e }: { e: Entry }) {
  const assets = e.assets || [];
  const best = bestAsset(e);
  const release = https(e.releaseUrl);
  if (!best) return release ? <Ext href={release} primary>查看版本 <ArrowUpRight size={15} aria-hidden="true" /></Ext> : null;
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
