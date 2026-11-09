import { memo, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { GlassDrawer } from "../components/GlassDrawer";
import { Kind, REPO } from "../data/catalog";
import { mountParticles } from "./particles";

const Stage = memo(function Stage({ children, side }: { children: React.ReactNode; side: React.ReactNode }) {
  const hero = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    mountParticles(hero.current, canvas.current, document.createElement("small"));
  }, []);
  return (
    <section className="hero" id="hero" ref={hero}>
      <canvas id="gl" ref={canvas} aria-hidden="true" />
      <h1 className="sr">EchoX</h1>
      <div className="ui">{children}</div>
      {side}
    </section>
  );
});

export function Hero({ counts, onJump, onSearch, onUpload }: { counts: Record<Kind, number>; onJump: (k: Kind) => void; onSearch: () => void; onUpload: () => void }) {
  return (
    <Stage side={<GlassDrawer counts={counts} onJump={onJump} />}>
      <div className="top">
        <strong>EchoX</strong>
        <nav className="top-nav" aria-label="主要内容">
          <button type="button" className="top-search" onClick={onSearch}><Search size={14} aria-hidden="true" /><span>搜索</span></button>
          <button type="button" className="top-search" onClick={onUpload}>上传</button>
          <a href={REPO}>GitHub ↗</a>
        </nav>
      </div>
      <div className="bottom">
        <a className="cta" href="#catalog">工具库 ↓</a>
      </div>
    </Stage>
  );
}
