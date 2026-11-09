import { useState, type ReactNode } from "react";
import { ChevronDown, Minus, Plus, GripVertical, X, ArrowUp, ArrowDown } from "lucide-react";
import { MODULE_MAX, clampCount } from "@/lib/home-config";
import { Button } from "@/components/ui/button";

export type ModuleItem = { id: string; label: string; detail?: string };

/** Shared compact glass module: Global Clock, News, Markets, Ticker and Quick Picks all use this. */
export function ConfigModule<T extends ModuleItem>({
  title,
  icon,
  catalog,
  initial,
  render,
}: {
  title: string;
  icon: ReactNode;
  catalog: T[];
  initial: number;
  render: (item: T) => ReactNode;
}) {
  const [order, setOrder] = useState<T[]>(catalog);
  const [count, setCount] = useState(clampCount(initial));
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const active = order.slice(0, count);

  const move = (from: number, to: number) => {
    if (from < 0 || from >= order.length || to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [x] = next.splice(from, 1);
    if (!x) return;
    next.splice(to, 0, x);
    setOrder(next);
  };
  const remove = (i: number) => {
    if (count <= 1 || i < 0 || i >= count) return;
    const next = [...order];
    const [x] = next.splice(i, 1);
    if (!x) return;
    next.push(x);
    setOrder(next);
    setCount(count - 1);
  };
  const add = (i: number) => {
    if (count >= MODULE_MAX) return;
    move(i, count);
    setCount(count + 1);
  };
  const dragProps = (i: number) => ({
    draggable: true,
    onDragStart: () => setDrag(i),
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: () => {
      if (drag !== null) move(drag, i);
      setDrag(null);
    },
  });

  return (
    <section
      className={`glass-module ${["Global Clock", "Global News", "Quick Picks"].includes(title) ? "compact-module" : ""}`}
      aria-label={title}
    >
      <div className="module-heading flex items-center gap-2 px-2.5 pt-1.5">
        <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-primary">
          {icon}
          {title}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="plain"
            size="plain"
            className="mini-btn"
            aria-label={`Fewer ${title} items`}
            disabled={count <= 1}
            onClick={() => setCount(clampCount(count - 1))}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span
            className="w-5 text-center font-display text-[10px] tabular-nums"
            aria-label={`${title} item count`}
          >
            {count}
          </span>
          <Button
            variant="plain"
            size="plain"
            className="mini-btn"
            aria-label={`More ${title} items`}
            disabled={count >= MODULE_MAX}
            onClick={() => setCount(clampCount(count + 1))}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="plain"
            size="plain"
            className="mini-btn"
            aria-label={`Configure ${title}`}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <ChevronDown className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`} />
          </Button>
        </div>
      </div>
      <div
        className="module-items grid gap-1.5 p-2 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))] lg:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
        style={{ ["--cols" as string]: Math.min(count, 5) }}
      >
        {active.map((it, i) => (
          <div
            key={it.id}
            {...dragProps(i)}
            className={`cursor-grab rounded-md border border-border/60 bg-secondary/25 px-2 py-1 ${drag === i ? "opacity-50" : ""}`}
          >
            {render(it)}
          </div>
        ))}
      </div>
      {open && (
        <div className="border-t border-border/50 p-2 text-[10px]">
          <div className="mb-1 text-[9px] uppercase tracking-widest text-muted-foreground">
            Drag to reorder • Showing {count} of {MODULE_MAX} max
          </div>
          <ul className="grid gap-1 sm:grid-cols-2">
            {order.map((it, i) => (
              <li
                key={it.id}
                {...dragProps(i)}
                className={`flex items-center gap-1 rounded border px-1.5 py-0.5 ${i < count ? "border-primary/50 bg-accent/15" : "border-border/40 opacity-60"}`}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground" />
                <span className="flex-1 truncate">{it.label}</span>
                <Button
                  variant="plain"
                  size="plain"
                  className="mini-btn !h-4 !w-4"
                  aria-label={`Move ${it.label} up`}
                  onClick={() => move(i, i - 1)}
                >
                  <ArrowUp className="h-2.5 w-2.5" />
                </Button>
                <Button
                  variant="plain"
                  size="plain"
                  className="mini-btn !h-4 !w-4"
                  aria-label={`Move ${it.label} down`}
                  onClick={() => move(i, i + 1)}
                >
                  <ArrowDown className="h-2.5 w-2.5" />
                </Button>
                {i < count ? (
                  <Button
                    variant="plain"
                    size="plain"
                    className="mini-btn !h-4 !w-4"
                    aria-label={`Remove ${it.label}`}
                    disabled={count <= 1}
                    onClick={() => remove(i)}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                ) : (
                  <Button
                    variant="plain"
                    size="plain"
                    className="mini-btn !h-4 !w-4"
                    aria-label={`Add ${it.label}`}
                    disabled={count >= MODULE_MAX}
                    onClick={() => add(i)}
                  >
                    <Plus className="h-2.5 w-2.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
