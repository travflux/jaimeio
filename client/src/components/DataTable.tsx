import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  emptyMessage?: string;
  className?: string;
};

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data available",
  className = "",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    
    if (aVal === bVal) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    
    const comparison = aVal < bVal ? -1 : 1;
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const getSortIcon = (key: string) => {
    if (sortKey !== key) return <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/50" />;
    return sortDirection === "asc" 
      ? <ChevronUp className="w-3.5 h-3.5 text-primary" />
      : <ChevronDown className="w-3.5 h-3.5 text-primary" />;
  };

  const getAlignClass = (align?: "left" | "center" | "right") => {
    if (align === "center") return "text-center";
    if (align === "right") return "text-right";
    return "text-left";
  };

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`py-3 px-4 font-medium text-muted-foreground ${getAlignClass(col.align)} ${col.className || ""}`}
                  >
                    {col.sortable ? (
                      <button
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors w-full"
                      >
                        <span>{col.header}</span>
                        {getSortIcon(col.key)}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                sortedData.map((row) => (
                  <tr
                    key={keyExtractor(row)}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`py-3 px-4 ${getAlignClass(col.align)} ${col.className || ""}`}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
