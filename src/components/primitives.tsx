import { AnimatePresence, motion } from "motion/react";
import { Check, Copy } from "lucide-react";
import { CSSProperties, KeyboardEvent, ReactNode, useId, useRef, useState } from "react";
import { Entry, hostOf } from "../data/catalog";

function hash32(s: string, salt: number) {
  let x = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
}

const STOP = new Set(["echox", "the", "and", "for", "with", "from", "your", "this", "that", "tool", "tools", "app", "apps", "github", "示例", "演示", "数据", "一个", "一篇", "用来", "这个", "可以"]);

function goodWord(w: string) {
  const t = w.trim();
  if (!t || STOP.has(t.toLowerCase()) || /^\d+$/.test(t)) return false;
  if (/[一-鿿]/.test(t)) return t.length >= 2;
  return t.length >= 3 || /^[A-Z]{2,}$/.test(t);
}

function wordsIn(text = ""): string[] {
  const spaced = text.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_/\\.:|·,，。、]+/g, " ");
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter("zh", { granularity: "word" });
    return [...seg.segment(spaced)].filter((s) => s.isWordLike).map((s) => s.segment);
  }
  return spaced.split(/\s+/);
}

/** 取最能代表条目的关键字：名称优先，博客的网页标题常常不准，所以简介优先 */
export function keywordsOf(e: Entry): string[] {
  const blogNote = e.kind === "blog" && e.summary !== hostOf(e.url) ? e.summary : "";
  const sources = blogNote ? [blogNote, e.title] : [e.title, (e.tags || []).join(" "), e.summary];
  const out: string[] = [];
  for (const src of sources) {
    for (const w of wordsIn(src)) {
      if (goodWord(w) && !out.some((x) => x.toLowerCase() === w.toLowerCase())) out.push(w);
      if (out.length === 3) return out;
    }
  }
  return out.length ? out : [e.title.slice(0, 8)];
}

const COVER_TONES = [
  ["#848e99", "#3f4a53"],
  ["#5f6973", "#1f272c"],
  ["#7f9b96", "#2f4145"],
  ["#6c7884", "#2a3338"],
  ["#4f7a72", "#232b30"],
];

/** 按关键字排版的封面，同一个条目永远得到同一张 */
export function AutoCover({ e }: { e: Entry }) {
  const [first, ...rest] = keywordsOf(e);
  const word = /[一-鿿]/.test(first) ? first : first.toUpperCase();
  const units = [...word].reduce((n, c) => n + (/[一-鿿]/.test(c) ? 1 : 0.68), 0);
  const [from, to] = COVER_TONES[hash32(e.id, 5) % COVER_TONES.length];
  const angle = (hash32(e.id, 91) % 70) + 115;
  return (
    <div className="auto-cover" aria-hidden="true" style={{ background: `linear-gradient(${angle}deg, ${from}, ${to})` }}>
      <div className="ac-word" style={{ "--u": units.toFixed(2) } as CSSProperties}><i>{word}</i><i>{word}</i>{word}</div>
      {rest.length > 0 && <div className="ac-rest">{rest.join(" · ")}</div>}
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
