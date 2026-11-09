import { AnimatePresence, motion } from "motion/react";
import { AppWindow, LayoutDashboard, Plus, Puzzle, Search } from "lucide-react";
import { useContext, useEffect, useMemo, useState } from "react";
import { UploadCtx } from "./Upload";
import { ALL_PLATFORMS, Entry, KINDS, Kind, PLATFORM_NAME, Platform, platformsOf } from "../data/catalog";
import { AppCard, PluginCard, WorkbenchCard } from "./cards";
import { EmptyFor } from "./Empty";
import { Segmented } from "./primitives";

const ICON = { workbench: LayoutDashboard, app: AppWindow, plugin: Puzzle };

/** 三列网格里让部分卡片占两列，保证每一行都排满 */
function isFeatured(i: number, n: number) {
  if (n % 3 === 2) return i === 0;
  if (n % 3 === 1 && n >= 4) return i === 0 || i === 3;
  return false;
}

export function Catalog({ entries, kind, setKind, onOpen, onSearch, counts }: { entries: Entry[]; kind: Kind; setKind: (k: Kind) => void; onOpen: (id: string) => void; onSearch: () => void; counts: Record<Kind, number> }) {
  const upload = useContext(UploadCtx);
  const [platform, setPlatform] = useState<"all" | Platform>("all");
  const [host, setHost] = useState("");
  const [tag, setTag] = useState("");
  useEffect(() => { setPlatform("all"); setHost(""); setTag(""); }, [kind]);

  const inKind = useMemo(() => entries.filter((e) => e.kind === kind), [entries, kind]);
  const hosts = useMemo(() => [...new Set(inKind.map((e) => e.host).filter(Boolean) as string[])], [inKind]);
  const tags = useMemo(() => [...new Set(inKind.flatMap((e) => e.tags || []))], [inKind]);
  const shown = inKind.filter((e) =>
    (platform === "all" || platformsOf(e).includes(platform)) && (!host || e.host === host) && (!tag || (e.tags || []).includes(tag)),
  );

  const segItems = (Object.keys(KINDS) as Kind[]).map((k) => {
    const I = ICON[k];
    return { value: k, count: counts[k], label: <><I size={16} aria-hidden="true" /><span className="lg">{KINDS[k].label}</span><span className="sm">{KINDS[k].short}</span></> };
  });

  return (
    <section className="catalog" id="catalog" aria-label="工具目录">
      <div className="bar">
        <Segmented label="内容类型" items={segItems} value={kind} onChange={setKind} />
        <div className="bar-right">
          <button type="button" className="searchbtn" onClick={onSearch}>
            <Search size={15} aria-hidden="true" /><span>搜索</span><kbd>Ctrl K</kbd>
          </button>
          <button type="button" className="btn primary bar-upload" onClick={() => upload({ kind })}><Plus size={15} aria-hidden="true" /><span>上传</span></button>
        </div>
      </div>

      {inKind.length > 0 && (
        <div className="filters">
          {kind === "app" && (
            <Segmented size="sm" label="按系统筛选" value={platform} onChange={setPlatform}
              items={[{ value: "all" as const, label: "全部系统" }, ...ALL_PLATFORMS.map((p) => ({ value: p, label: PLATFORM_NAME[p] }))]} />
          )}
          {kind === "plugin" && hosts.length > 1 && (
            <Segmented size="sm" label="按运行环境筛选" value={host || "all"} onChange={(v) => setHost(v === "all" ? "" : v)}
              items={[{ value: "all", label: "全部环境" }, ...hosts.map((h) => ({ value: h, label: h }))]} />
          )}
          {tags.length > 0 && (
            <div className="chips">
              {tags.map((t) => (
                <button key={t} type="button" className="chip" aria-pressed={tag === t} onClick={() => setTag(tag === t ? "" : t)}>{t}</button>
              ))}
            </div>
          )}
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={kind} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {inKind.length === 0 ? (
            <EmptyFor kind={kind} />
          ) : shown.length === 0 ? (
            <div className="none"><p>没有符合条件的条目。</p><button type="button" className="btn" onClick={() => { setPlatform("all"); setHost(""); setTag(""); }}>清除筛选</button></div>
          ) : (
            <div className={kind === "workbench" ? "grid-wb" : kind === "app" ? "grid-app" : "grid-plug"}>
              <AnimatePresence mode="popLayout" initial={false}>
                {shown.map((e, i) =>
                  kind === "workbench" ? <WorkbenchCard key={e.id} e={e} onOpen={onOpen} featured={isFeatured(i, shown.length)} />
                    : kind === "app" ? <AppCard key={e.id} e={e} onOpen={onOpen} />
                    : <PluginCard key={e.id} e={e} onOpen={onOpen} />,
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
