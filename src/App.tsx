import { useCallback, useEffect, useMemo, useState } from "react";
import { Catalog } from "./components/Catalog";
import { DetailSheet } from "./components/DetailSheet";
import { Palette } from "./components/Palette";
import { Footer } from "./components/Steps";
import { UploadCtx, UploadDialog, UploadRequest } from "./components/Upload";
import { clean, DEMO, Kind, REAL } from "./data/catalog";
import { Hero } from "./hero/Hero";

export default function App() {
  const [demoOn, setDemoOn] = useState(Boolean(DEMO));
  const entries = useMemo(() => (demoOn && DEMO ? DEMO : clean(REAL)), [demoOn]);
  const [kind, setKind] = useState<Kind>("workbench");
  const [palette, setPalette] = useState(false);
  const [hash, setHash] = useState(location.hash);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadReq, setUploadReq] = useState<UploadRequest | undefined>();

  const openUpload = useCallback((r?: UploadRequest) => { setUploadReq(r); setUploadOpen(true); }, []);

  useEffect(() => {
    const onHash = () => setHash(location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const detailId = /^#item-([a-z0-9-]{1,64})$/.exec(hash)?.[1];
  const detail = entries.find((e) => e.id === detailId);
  useEffect(() => { if (detail) setKind(detail.kind); }, [detail]);

  const counts = useMemo(() => {
    const c: Record<Kind, number> = { workbench: 0, app: 0, plugin: 0 };
    entries.forEach((e) => c[e.kind]++);
    return c;
  }, [entries]);

  const openItem = (id: string) => { location.hash = `item-${id}`; };
  function closeItem() {
    try { history.replaceState(null, "", location.pathname + location.search); } catch { /* 沙箱环境里可能不允许 */ }
    setHash("");
  }
  function jump(k: Kind) {
    setKind(k);
    document.getElementById("catalog")?.scrollIntoView();
  }

  return (
    <UploadCtx.Provider value={openUpload}>
      <a className="skip" href="#catalog">跳到工具库</a>
      <Hero counts={counts} onJump={jump} onSearch={() => setPalette(true)} onUpload={() => openUpload({ kind })} />
      <main className="main">
        <div className="wrap stack">
          {import.meta.env.VITE_ECHOX_DEMO === "1" && DEMO && (
            <div className="demo-bar">
              <span>{demoOn ? "演示数据" : "空状态"}</span>
              <button type="button" className="btn" onClick={() => setDemoOn(!demoOn)}>{demoOn ? "查看空状态" : "查看演示数据"}</button>
            </div>
          )}
          <Catalog entries={entries} kind={kind} setKind={setKind} onOpen={openItem} onSearch={() => setPalette(true)} counts={counts} />
        </div>
      </main>
      <Footer />
      <Palette open={palette} onOpenChange={setPalette} entries={entries} onPick={openItem} onJump={jump} onUpload={() => openUpload({ kind })} />
      <DetailSheet open={Boolean(detailId)} entry={detail} onClose={closeItem} />
      <UploadDialog open={uploadOpen} request={uploadReq} onClose={() => setUploadOpen(false)} />
    </UploadCtx.Provider>
  );
}
