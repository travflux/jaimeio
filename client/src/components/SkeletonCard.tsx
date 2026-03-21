import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        <div className="h-3 w-48 bg-muted animate-pulse rounded mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-4 bg-muted animate-pulse rounded" style={{ width: `${Math.random() * 30 + 60}%` }} />
        ))}
      </CardContent>
    </Card>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {Array.from({ length: cols }).map((_, i) => (
                  <th key={i} className="py-3 px-4">
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-border last:border-0">
                  {Array.from({ length: cols }).map((_, colIndex) => (
                    <td key={colIndex} className="py-3 px-4">
                      <div className="h-4 bg-muted animate-pulse rounded" style={{ width: `${Math.random() * 40 + 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonStat() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}
