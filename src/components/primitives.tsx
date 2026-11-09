import { AnimatePresence, motion } from "motion/react";
import { Check, Copy } from "lucide-react";
import { KeyboardEvent, ReactNode, useId, useRef, useState } from "react";

function hash32(s: string, salt: number) {
  let x = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
}

/** 按字符串生成确定的 SSH randomart 式封面，同一个编号永远得到同一张图 */
function randomart(seed: string, ghost: boolean) {
  const W = 33, H = 18;
  const grid = new Array(W * H).fill(0);
  let x = 16, y = 9;
  for (let b = 0; b < 90; b++) {
    const v = hash32(seed, b * 2654435);
    for (let s = 0; s < 8; s += 2) {
      const m = (v >>> s) & 3;
      x = Math.max(0, Math.min(W - 1, x + (m & 1 ? 1 : -1)));
      y = Math.max(0, Math.min(H - 1, y + (m & 2 ? 1 : -1)));
      grid[y * W + x]++;
    }
  }
  const dim = ghost ? "#88919c" : "#ffffff";
  const hot = ghost ? "#5f6973" : "#a6f3df";
  const dots: ReactNode[] = [];
  for (let cy = 0; cy < H; cy++) {
    for (let cx = 0; cx < W; cx++) {
      const n = grid[cy * W + cx];
      const isEnd = (cx === x && cy === y) || (cx === 16 && cy === 9);
      dots.push(
        <circle key={`${cx}-${cy}`} cx={cx * 5.15 + 2.6} cy={cy * 5.3 + 2.8}
          r={isEnd ? 2.3 : n === 0 ? 0.32 : Math.min(2, 0.62 + n * 0.26)}
          fill={n >= 4 || isEnd ? hot : dim} opacity={n === 0 ? 0.24 : 0.9} />,
      );
    }
  }
  return dots;
}

export function Art({ seed, ghost = false }: { seed: string; ghost?: boolean }) {
  const gid = useId();
  const angle = (hash32(seed, 91) % 90) + 20;
  return (
    <svg className="art" viewBox="0 0 170 95.6" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {!ghost && (
        <>
          <defs>
            <linearGradient id={gid} gradientTransform={`rotate(${angle} .5 .5)`}>
              <stop offset="0" stopColor="#88919c" /><stop offset=".55" stopColor="#5f6973" /><stop offset="1" stopColor="#3a444c" />
            </linearGradient>
          </defs>
          <rect width="170" height="95.6" fill={`url(#${gid})`} />
        </>
      )}
      {randomart(seed, ghost)}
    </svg>
  );
}

export function AppIcon({ seed, title }: { seed: string; title: string }) {
  const a = (hash32(seed, 3) % 70) + 110;
  const glyph = title.replace(/^示例[：:]/, "").trim().charAt(0).toUpperCase();
  return (
    <div className="appicon" aria-hidden="true" style={{ background: `linear-gradient(${a}deg, #e8edf0 0%, #88919c 48%, #3f4a53 100%)` }}>
      <span>{glyph}</span>
    </div>
  );
}

export interface SegItem<T extends string> { value: T; label: ReactNode; count?: number }

/** 带滑动指示块的分段选择，支持左右方向键 */
export function Segmented<T extends string>({ items, value, onChange, label, size = "md" }: { items: SegItem<T>[]; value: T; onChange: (v: T) => void; label: string; size?: "md" | "sm" }) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKey(e: KeyboardEvent, i: number) {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + items.length) % items.length;
    onChange(items[n].value);
    refs.current[n]?.focus();
  }
  return (
    <div className={`seg seg-${size}`} role="tablist" aria-label={label}>
      {items.map((it, i) => {
        const on = it.value === value;
        return (
          <button key={it.value} ref={(n) => { refs.current[i] = n; }} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1}
            className={on ? "on" : ""} onClick={() => onChange(it.value)} onKeyDown={(e) => onKey(e, i)}>
            {on && <motion.span className="seg-pill" layoutId={`pill-${id}`} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className="seg-in">{it.label}{it.count !== undefined && <em>{it.count}</em>}</span>
          </button>
        );
      })}
    </div>
  );
}

export function CopyCommand({ text, prompt = "$" }: { text: string; prompt?: string }) {
  const [done, setDone] = useState(false);
  const code = useRef<HTMLElement>(null);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    } catch {
      const r = document.createRange();
      if (code.current) {
        r.selectNodeContents(code.current);
        const s = getSelection();
        s?.removeAllRanges();
        s?.addRange(r);
      }
    }
  }
  return (
    <div className="term">
      <div className="term-scroll"><span className="term-p" aria-hidden="true">{prompt}</span><code ref={code}>{text}</code></div>
      <button type="button" className="term-copy" onClick={copy} aria-label={done ? "已复制安装命令" : "复制安装命令"}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={done ? "y" : "n"} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.12 }} style={{ display: "inline-flex" }}>
            {done ? <Check size={15} /> : <Copy size={15} />}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}
