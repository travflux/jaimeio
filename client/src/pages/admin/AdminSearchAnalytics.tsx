import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function AdminSearchAnalytics() {
  return (
    <AdminLayout>
      <SearchAnalyticsContent />
    </AdminLayout>
  );
}

function SearchAnalyticsContent() {
  const [days, setDays] = useState("30");
  const [limit, setLimit] = useState("20");
  
  const { data: popularSearches, isLoading: loadingPopular } = trpc.analytics.popularSearches.useQuery({ limit: parseInt(limit) });
  const { data: searchHistory, isLoading: loadingHistory } = trpc.analytics.searchHistory.useQuery({ days: parseInt(days) });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Search className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Search Analytics</h1>
          <p className="text-muted-foreground text-sm">Track popular search terms and identify content gaps</p>
        </div>
      </div>

      {/* Popular Searches */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border bg-muted/30">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Popular Searches
            </CardTitle>
            <CardDescription>Most searched terms and their performance</CardDescription>
          </div>
          <Select value={limit} onValueChange={setLimit}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">Top 10</SelectItem>
              <SelectItem value="20">Top 20</SelectItem>
              <SelectItem value="50">Top 50</SelectItem>
              <SelectItem value="100">Top 100</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loadingPopular ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !popularSearches || popularSearches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No search data available yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Search Term</TableHead>
                  <TableHead className="text-right">Times Searched</TableHead>
                  <TableHead className="text-right">Avg Results</TableHead>
                  <TableHead className="text-right">Last Searched</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {popularSearches.map((search, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{search.query}</TableCell>
                    <TableCell className="text-right">{search.searchCount}</TableCell>
                    <TableCell className="text-right">{Math.round(search.avgResults)}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {new Date(search.lastSearched).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Search History */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border bg-muted/30">
          <div>
            <CardTitle>Recent Search History</CardTitle>
            <CardDescription>All search queries with filters and results</CardDescription>
          </div>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Past 7 Days</SelectItem>
              <SelectItem value="30">Past 30 Days</SelectItem>
              <SelectItem value="90">Past 90 Days</SelectItem>
              <SelectItem value="365">Past Year</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !searchHistory || searchHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No search history for this period</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead>Results</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead className="text-right">Searched At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchHistory.map((search) => (
                    <TableRow key={search.id}>
                      <TableCell className="font-medium">{search.query}</TableCell>
                      <TableCell>{search.resultsCount}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {search.categoryFilter ? `ID: ${search.categoryFilter}` : "All"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {search.dateRangeFilter || "All"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {new Date(search.searchedAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
