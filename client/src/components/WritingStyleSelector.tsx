import { WRITING_STYLE_CATEGORIES, type WritingStyleCategory, type WritingStyle } from "../../../shared/writingStyles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface WritingStyleSelectorProps {
  selectedStyle: string;
  excludedStyles: Set<string>;
  onStyleSelect: (styleId: string) => void;
  onExcludedStylesChange: (excluded: Set<string>) => void;
}

export default function WritingStyleSelector({
  selectedStyle,
  excludedStyles,
  onStyleSelect,
  onExcludedStylesChange,
}: WritingStyleSelectorProps) {
  const [showDetails, setShowDetails] = useState(false);

  const toggleStyleExclusion = (styleId: string) => {
    const newExcluded = new Set(excludedStyles);
    if (newExcluded.has(styleId)) {
      newExcluded.delete(styleId);
    } else {
      newExcluded.add(styleId);
    }
    onExcludedStylesChange(newExcluded);
  };

  return (
    <div className="space-y-4">
      {/* Quick category selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {WRITING_STYLE_CATEGORIES.map((category: WritingStyleCategory) => (
          <button
            key={category.id}
            onClick={() => onStyleSelect(`random-${category.id}`)}
            className={`p-2 rounded-lg border text-center text-xs transition-all ${
              selectedStyle === `random-${category.id}`
                ? "border-primary bg-primary/10 font-medium"
                : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Expandable style settings */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full p-2 rounded-lg border border-border hover:border-primary/50 text-left text-sm font-medium transition-all flex items-center justify-between"
      >
        <span>Fine-tune styles</span>
        {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Detailed style selector (collapsed by default) */}
      {showDetails && (
        <Tabs defaultValue={WRITING_STYLE_CATEGORIES[0]?.id ?? "onion"} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 h-auto">
            {WRITING_STYLE_CATEGORIES.map((category: WritingStyleCategory) => (
              <TabsTrigger key={category.id} value={category.id} className="text-xs">
                {category.name.split(" ")[0]}
              </TabsTrigger>
            ))}
          </TabsList>

          {WRITING_STYLE_CATEGORIES.map((category: WritingStyleCategory) => (
            <TabsContent key={category.id} value={category.id} className="space-y-2">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {category.styles.map((style: WritingStyle) => (
                  <div
                    key={style.id}
                    className="flex items-start gap-3 p-2 rounded-lg border border-border/50 hover:border-primary/50 transition-all"
                  >
                    <input
                      type="checkbox"
                      id={`style-${style.id}`}
                      checked={!excludedStyles.has(style.id)}
                      onChange={() => toggleStyleExclusion(style.id)}
                      className="w-4 h-4 rounded border-input mt-1 flex-shrink-0 cursor-pointer"
                    />
                    <label htmlFor={`style-${style.id}`} className="flex-1 cursor-pointer">
                      <button
                        onClick={() => onStyleSelect(style.id)}
                        className={`w-full text-left transition-all ${
                          selectedStyle === style.id ? "font-medium text-primary" : "text-foreground"
                        }`}
                      >
                        <p className="text-sm font-medium">{style.name}</p>
                        <p className="text-xs text-muted-foreground">{style.description}</p>
                      </button>
                    </label>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
