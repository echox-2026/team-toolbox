import { useCallback, useEffect, useMemo, useState } from "react";
import { Catalog } from "./components/Catalog";
import { DetailSheet } from "./components/DetailSheet";
import { Palette } from "./components/Palette";
import { Footer } from "./components/Steps";
import { UploadCtx, UploadDialog, UploadRequest } from "./components/Upload";
import { clean, DEMO, Entry, Kind, UPLOAD_API } from "./data/catalog";
import { Hero } from "./hero/Hero";

export type LoadStatus = "loading" | "ready" | "failed";

export default function App() {
  const [demoOn, setDemoOn] = useState(Boolean(DEMO));
  const [remote, setRemote] = useState<Entry[]>([]);
  const [status, setStatus] = useState<LoadStatus>(UPLOAD_API ? "loading" : "ready");
  const entries = useMemo(() => (demoOn && DEMO ? DEMO : remote), [demoOn, remote]);
  const [kind, setKind] = useState<Kind>("workbench");
  const [palette, setPalette] = useState(false);
  const [hash, setHash] = useState(location.hash);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadReq, setUploadReq] = useState<UploadRequest | undefined>();

  const openUpload = useCallback((r?: UploadRequest) => { setUploadReq(r); setUploadOpen(true); }, []);

  const reload = useCallback(async () => {
    if (!UPLOAD_API) return;
    try {
      const r = await fetch(`${UPLOAD_API}/entries`, { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      setRemote(clean((await r.json()).entries));
      setStatus("ready");
    } catch {
      setStatus((s) => (s === "ready" ? s : "failed"));
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);

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
    const c: Record<Kind, number> = { workbench: 0, app: 0, plugin: 0, blog: 0 };
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
          <Catalog entries={entries} kind={kind} setKind={setKind} onOpen={openItem} onSearch={() => setPalette(true)} counts={counts} status={demoOn ? "ready" : status} />
        </div>
      </main>
      <Footer />
      <Palette open={palette} onOpenChange={setPalette} entries={entries} onPick={openItem} onJump={jump} onUpload={() => openUpload({ kind })} />
      <DetailSheet open={Boolean(detailId) && (demoOn || status !== "loading")} entry={detail} onClose={closeItem} onDeleted={() => { closeItem(); reload(); }} />
      <UploadDialog open={uploadOpen} request={uploadReq} onClose={() => setUploadOpen(false)} onDone={reload} />
    </UploadCtx.Provider>
  );
}
