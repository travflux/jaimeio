import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ChevronDown, HelpCircle } from "lucide-react";

const HEADING_FONTS = [
  "Playfair Display", "Merriweather", "Oswald", "Raleway", "Montserrat",
  "Roboto Slab", "Lora", "Cinzel", "Bebas Neue", "Abril Fatface",
  "DM Serif Display", "Cormorant Garamond", "Spectral", "Libre Baskerville",
];

const BODY_FONTS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Source Sans Pro", "Nunito",
  "PT Sans", "Noto Sans", "Mulish", "Work Sans", "DM Sans", "Figtree",
  "Outfit", "Plus Jakarta Sans", "Karla",
];

const loadedFonts = new Set<string>();

function loadFont(name: string) {
  if (loadedFonts.has(name)) return;
  loadedFonts.add(name);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, "+")}&display=swap`;
  document.head.appendChild(link);
}

interface GoogleFontPickerProps {
  value: string;
  onChange: (font: string) => void;
  type: "heading" | "body";
  label: string;
  tooltip?: string;
}

export function GoogleFontPicker({ value, onChange, type, label, tooltip }: GoogleFontPickerProps) {
  const fonts = type === "heading" ? HEADING_FONTS : BODY_FONTS;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Load selected font
  useEffect(() => { if (value) loadFont(value); }, [value]);

  // Load all fonts in list for preview
  useEffect(() => { fonts.forEach(f => loadFont(f)); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = fonts.filter(f => f.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <label className="text-sm font-medium flex items-center gap-0.5 mb-1.5">
        {label}
        {tooltip && (
          <span className="relative inline-block ml-1 group">
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 text-xs bg-popover border rounded-lg shadow-lg text-popover-foreground hidden group-hover:block">
              {tooltip}
            </span>
          </span>
        )}
      </label>

      {/* Trigger */}
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-background text-sm hover:bg-muted/50 transition-colors">
        <span style={{ fontFamily: value ? `"${value}", sans-serif` : undefined }}>
          {value || "Select a font..."}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-background border rounded-lg shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b">
            <Input placeholder="Search fonts..." value={search} onChange={e => setSearch(e.target.value)}
              className="h-8 text-sm" autoFocus />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground p-3 text-center">No fonts found</p>
            )}
            {filtered.map(font => (
              <button key={font} type="button"
                className={"w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors " +
                  (font === value ? "bg-primary/10 text-primary font-medium" : "")
                }
                style={{ fontFamily: `"${font}", sans-serif` }}
                onClick={() => { onChange(font); setOpen(false); setSearch(""); }}>
                {font}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {value && (
        <div className="mt-3 p-4 border rounded-lg bg-muted/30">
          {type === "heading" ? (
            <p style={{ fontFamily: `"${value}", sans-serif`, fontSize: 24, lineHeight: 1.3 }}>
              The Quick Brown Fox Jumps Over The Lazy Dog
            </p>
          ) : (
            <p style={{ fontFamily: `"${value}", sans-serif`, fontSize: 16, lineHeight: 1.6 }}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
