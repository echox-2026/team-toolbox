import { Command } from "cmdk";
import { AppWindow, LayoutDashboard, Newspaper, Plus, Puzzle } from "lucide-react";
import { Entry, KINDS, Kind } from "../data/catalog";

const ICON = { workbench: LayoutDashboard, app: AppWindow, plugin: Puzzle, blog: Newspaper };

export function Palette({ open, onOpenChange, entries, onPick, onJump, onUpload }: { open: boolean; onOpenChange: (o: boolean) => void; entries: Entry[]; onPick: (id: string) => void; onJump: (k: Kind) => void; onUpload: () => void }) {
  const kinds = Object.keys(KINDS) as Kind[];
  function run(fn: () => void) {
    onOpenChange(false);
    fn();
  }
  return (
    <Command.Dialog open={open} onOpenChange={onOpenChange} label="搜索全部内容" overlayClassName="palette-back" contentClassName="palette">
      <Command.Input placeholder="搜索" />
      <Command.List>
        <Command.Empty>没有结果</Command.Empty>
        {kinds.map((k) => {
          const list = entries.filter((e) => e.kind === k);
          const I = ICON[k];
          return list.length ? (
            <Command.Group key={k} heading={KINDS[k].label}>
              {list.map((e) => (
                <Command.Item key={e.id} value={e.id} keywords={[e.title, e.summary, e.author || "", e.host || "", ...(e.tags || [])]} onSelect={() => run(() => onPick(e.id))}>
                  <I size={16} aria-hidden="true" /><span>{e.title}</span>{e.author && <em>{e.author}</em>}
                </Command.Item>
              ))}
            </Command.Group>
          ) : null;
        })}
        <Command.Group heading="快捷入口">
          {kinds.map((k) => {
            const I = ICON[k];
            return <Command.Item key={k} value={`jump-${k}`} keywords={[KINDS[k].label]} onSelect={() => run(() => onJump(k))}><I size={16} aria-hidden="true" /><span>{KINDS[k].label}</span></Command.Item>;
          })}
          <Command.Item value="upload" keywords={["上传", "发布"]} onSelect={() => run(onUpload)}><Plus size={16} aria-hidden="true" /><span>上传</span></Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
