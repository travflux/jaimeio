import { horoscopeCategories, HoroscopeCategory } from "@shared/horoscopeStyles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface HoroscopeStyleSelectorProps {
  selectedStyle: string;
  excludedStyles: Set<string>;
  onStyleSelect: (styleId: string) => void;
  onExcludedStylesChange: (excluded: Set<string>) => void;
}

export default function HoroscopeStyleSelector({
  selectedStyle,
  excludedStyles,
  onStyleSelect,
  onExcludedStylesChange,
}: HoroscopeStyleSelectorProps) {
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {horoscopeCategories.map((category: HoroscopeCategory) => (
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
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {showDetails ? "Hide" : "Show"} detailed style options
      </button>

      {showDetails && (
        <Tabs defaultValue={horoscopeCategories[0].id} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${horoscopeCategories.length}, 1fr)` }}>
            {horoscopeCategories.map((category) => (
              <TabsTrigger key={category.id} value={category.id} className="text-xs">
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {horoscopeCategories.map((category) => (
            <TabsContent key={category.id} value={category.id} className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => onStyleSelect(`random-${category.id}`)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Random from {category.name}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {category.styles.map((style) => (
                  <div
                    key={style.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedStyle === style.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    } ${
                      excludedStyles.has(style.id) ? "opacity-50" : ""
                    }`}
                    onClick={() => onStyleSelect(style.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{style.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{style.description}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={!excludedStyles.has(style.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleStyleExclusion(style.id);
                        }}
                        className="mt-1"
                        title="Include in randomizer"
                      />
                    </div>
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
