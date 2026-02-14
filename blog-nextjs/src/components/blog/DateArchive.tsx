"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface ArchiveEntry {
  key: string;       // "2026-02"
  label: string;     // "2026年2月"
  count: number;
}

interface DateArchiveProps {
  archives: ArchiveEntry[];
  selected: string | null;
  onSelect: (key: string | null) => void;
  totalCount: number;
}

/** Desktop sidebar version */
export function DateArchiveSidebar({ archives, selected, onSelect, totalCount }: DateArchiveProps) {
  return (
    <aside className="hidden lg:block w-48 shrink-0">
      <nav className="sticky top-24">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          日期归档
        </h3>
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => onSelect(null)}
              className={`w-full text-left text-sm px-3 py-1.5 rounded-md transition-colors ${
                selected === null
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              全部 ({totalCount})
            </button>
          </li>
          {archives.map((a) => (
            <li key={a.key}>
              <button
                onClick={() => onSelect(a.key)}
                className={`w-full text-left text-sm px-3 py-1.5 rounded-md transition-colors ${
                  selected === a.key
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {a.label} ({a.count})
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

/** Mobile dropdown version */
export function DateArchiveMobile({ archives, selected, onSelect, totalCount }: DateArchiveProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        日期归档：{selected ? archives.find((a) => a.key === selected)?.label : "全部"}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              selected === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            全部 ({totalCount})
          </button>
          {archives.map((a) => (
            <button
              key={a.key}
              onClick={() => { onSelect(a.key); setOpen(false); }}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                selected === a.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {a.label} ({a.count})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
