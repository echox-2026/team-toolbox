import { motion } from "motion/react";
import { AppWindow, LayoutDashboard, Newspaper, Puzzle } from "lucide-react";
import { PointerEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ALL_PLATFORMS, KINDS, Kind, PLATFORM_NAME } from "../data/catalog";

const ICON = { workbench: LayoutDashboard, app: AppWindow, plugin: Puzzle, blog: Newspaper };
const RAIL = 66;
const GAP = 14;
const RADIUS = 26;
const BEZEL = 30;
const FILTER_ID = "echox-liquid";

/** 生成玻璃边缘的折射位移图：越靠近边缘，取样点越向内收 */
function displacementMap(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const hw = w / 2, hh = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hw, py = y + 0.5 - hh;
      const qx = Math.abs(px) - (hw - RADIUS), qy = Math.abs(py) - (hh - RADIUS);
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0), len = Math.hypot(ox, oy);
      const edge = RADIUS - len - Math.min(Math.max(qx, qy), 0);
      let nx = 0, ny = 0;
      if (len > 0) { nx = (ox / len) * Math.sign(px); ny = (oy / len) * Math.sign(py); }
      else if (qx > qy) nx = Math.sign(px);
      else ny = Math.sign(py);
      const m = edge <= 0 ? 0 : Math.pow(1 - Math.min(edge / BEZEL, 1), 2);
      const i = (y * w + x) * 4;
      img.data[i] = 128 - nx * m * 127;
      img.data[i + 1] = 128 - ny * m * 127;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}

function MiniChart() {
  return (
    <svg viewBox="0 0 110 62" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 48 C14 40 20 16 34 22 S56 50 70 32 92 10 110 16" fill="none" stroke="#a6f3df" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
      <path d="M0 55 C16 50 28 38 44 42 S78 58 110 40" fill="none" stroke="#e8edf0" strokeOpacity=".55" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
function MiniOS() {
  return <span className="gd-os" aria-hidden="true">{ALL_PLATFORMS.map((p) => <i key={p}>{PLATFORM_NAME[p].charAt(0)}</i>)}</span>;
}
function MiniTerm() {
  return <span className="gd-term" aria-hidden="true"><b>$</b><span className="cursor" /></span>;
}
function MiniBlog() {
  return <span className="gd-lines" aria-hidden="true"><i /><i /><i /></span>;
}
const MINI = { workbench: MiniChart, app: MiniOS, plugin: MiniTerm, blog: MiniBlog };

export function GlassDrawer({ counts, onJump }: { counts: Record<Kind, number>; onJump: (k: Kind) => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState({ w: 340, h: 340 });
  const [map, setMap] = useState("");
  const [liquid] = useState(() => /Chrome\//.test(navigator.userAgent));

  useLayoutEffect(() => {
    const el = panel.current!;
    const measure = () => setSize((s) => (s.w === el.offsetWidth && s.h === el.offsetHeight ? s : { w: el.offsetWidth, h: el.offsetHeight }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { if (liquid && size.w && size.h) setMap(displacementMap(size.w, size.h)); }, [liquid, size]);

  useEffect(() => {
    if (!open) return;
    const away = (e: globalThis.PointerEvent) => { if (!panel.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  function show(e: PointerEvent) {
    if (e.pointerType === "touch") return;
    clearTimeout(timer.current);
    setOpen(true);
  }
  function hide(e: PointerEvent) {
    if (e.pointerType === "touch") return;
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), 220);
  }
  function glow(e: PointerEvent<HTMLDivElement>) {
    const b = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--gx", `${e.clientX - b.left}px`);
    e.currentTarget.style.setProperty("--gy", `${e.clientY - b.top}px`);
  }

  const glass = liquid && map ? `url(#${FILTER_ID}) blur(7px) saturate(1.5) brightness(1.05)` : undefined;

  return (
    <>
      {liquid && map && (
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
          <filter id={FILTER_ID} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feImage href={map} x="0" y="0" width={size.w} height={size.h} preserveAspectRatio="none" result="map" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale="58" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      )}
      <motion.div
        ref={panel}
        className="gd"
        data-open={open}
        role="navigation"
        aria-label="内容分类"
        style={glass ? { backdropFilter: glass, WebkitBackdropFilter: glass } : undefined}
        initial={false}
        animate={{ x: open ? GAP : -(size.w - RAIL) }}
        transition={{ type: "spring", stiffness: 300, damping: 24, mass: 0.9 }}
        onPointerEnter={show}
        onPointerLeave={hide}
        onPointerMove={glow}
        onFocus={() => setOpen(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}
      >
        {(Object.keys(KINDS) as Kind[]).map((k) => {
          const I = ICON[k];
          const M = MINI[k];
          return (
            <button
              key={k}
              type="button"
              className="gd-row"
              onClick={(e) => {
                if (!open) { e.preventDefault(); setOpen(true); return; }
                setOpen(false);
                onJump(k);
              }}
            >
              <span className="gd-mini"><M /></span>
              <span className="gd-text"><strong>{KINDS[k].label}</strong><em>{counts[k]}</em></span>
              <span className="gd-rail"><I size={21} aria-hidden="true" /></span>
            </button>
          );
        })}
      </motion.div>
    </>
  );
}
