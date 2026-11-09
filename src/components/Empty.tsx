import { useContext } from "react";
import { ALL_PLATFORMS, Kind, PLATFORM_NAME } from "../data/catalog";
import { Art } from "./primitives";
import { UploadCtx } from "./Upload";

function Upload({ kind }: { kind: Kind }) {
  const open = useContext(UploadCtx);
  return <button type="button" className="btn primary" onClick={() => open({ kind })}>上传</button>;
}

function WorkbenchEmpty() {
  return (
    <div className="grid-wb">
      {[0, 1].map((i) => (
        <div key={i} className={`wb slot${i === 0 ? " feat" : ""}`}>
          <div className="chrome" aria-hidden="true"><i /><i /><i /><span className="addr">&nbsp;</span></div>
          <div className="wb-cover ghosted"><Art seed={`wb-slot-${i}`} ghost /></div>
          {i === 0 && <div className="wb-body"><div className="acts"><Upload kind="workbench" /></div></div>}
        </div>
      ))}
    </div>
  );
}

function AppEmpty() {
  return (
    <div className="grid-app three">
      {ALL_PLATFORMS.map((p) => (
        <div key={p} className="app slot">
          <div className="appicon ghost" aria-hidden="true"><span>{PLATFORM_NAME[p].charAt(0)}</span></div>
          <div className="app-main">
            <div className="app-head"><h3>{PLATFORM_NAME[p]}</h3></div>
            <div className="acts"><Upload kind="app" /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PluginEmpty() {
  return (
    <div className="term-empty">
      <div className="chrome dark" aria-hidden="true"><i /><i /><i /><span className="addr">&nbsp;</span></div>
      <div className="term-lines"><p className="cursor-line"><b>$</b> <span className="cursor" aria-hidden="true" /></p></div>
      <div className="acts"><Upload kind="plugin" /></div>
    </div>
  );
}

export function EmptyFor({ kind }: { kind: Kind }) {
  if (kind === "workbench") return <WorkbenchEmpty />;
  if (kind === "app") return <AppEmpty />;
  return <PluginEmpty />;
}
