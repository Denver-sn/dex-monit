'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle,
  XCircle,
  MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { issuesApi, Issue } from '@/lib/api-client';

function formatTimeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

const levelConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  FATAL: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-500' },
  ERROR: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', dot: 'bg-orange-500' },
  WARNING: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', dot: 'bg-yellow-500' },
  INFO: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-500' },
  DEBUG: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', dot: 'bg-purple-500' },
};

// Mini sparkline chart component
function Sparkline({ data, level }: { data: number[]; level: string }) {
  const max = Math.max(...data, 1);
  const height = 24;
  const width = 60;
  const barWidth = width / data.length - 1;

  const colors: Record<string, string> = {
    FATAL: '#ef4444',
    ERROR: '#f97316',
    WARNING: '#eab308',
    INFO: '#3b82f6',
    DEBUG: '#a855f7',
  };

  const color = colors[level] || colors.INFO;

  return (
    <svg width={width} height={height} className="opacity-70">
      {data.map((value, i) => {
        const barHeight = Math.max((value / max) * height, 2);
        return (
          <rect
            key={i}
            x={i * (barWidth + 1)}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            fill={color}
            rx={1}
          />
        );
      })}
    </svg>
  );
}

function IssuesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get('status') || 'all'
  );
  const [levelFilter, setLevelFilter] = useState<string>(
    searchParams.get('level') || 'all'
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  const loadIssues = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const result = await issuesApi.list({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        level: levelFilter !== 'all' ? levelFilter : undefined,
        page,
        pageSize: 25,
        sortBy: 'lastSeen',
        sortOrder: 'desc',
      });

      setIssues(result.data);
      setTotalPages(result.meta.totalPages);
      setTotal(result.meta.total);
    } catch (err) {
      console.error('Failed to load issues:', err);
      setError('Failed to load issues');
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter, levelFilter, page]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const filteredIssues = issues.filter((issue) => {
    if (!search) return true;
    return (
      issue.title.toLowerCase().includes(search.toLowerCase()) ||
      issue.shortId.toLowerCase().includes(search.toLowerCase()) ||
      issue.culprit?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const toggleIssueSelection = (id: string) => {
    const newSelection = new Set(selectedIssues);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIssues(newSelection);
  };

  const handleBulkResolve = async () => {
    for (const id of selectedIssues) {
      await issuesApi.resolve(id);
    }
    setSelectedIssues(new Set());
    loadIssues();
  };

  const handleBulkIgnore = async () => {
    for (const id of selectedIssues) {
      await issuesApi.ignore(id);
    }
    setSelectedIssues(new Set());
    loadIssues();
  };

  if (authLoading || !user) {
    return null;
  }

  // Generate fake sparkline data for demo
  const generateSparklineData = () => Array.from({ length: 12 }, () => Math.floor(Math.random() * 20));

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold tracking-tight">Issues</h1>
            <p className="text-sm text-muted-foreground">
              {total > 0 ? `${total.toLocaleString()} issues` : 'No issues found'}
            </p>
          </div>
          {selectedIssues.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedIssues.size} selected
              </span>
              <Button size="sm" variant="outline" onClick={handleBulkResolve}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Resolve
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkIgnore}>
                <XCircle className="mr-2 h-4 w-4" />
                Ignore
              </Button>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Filters - Sentry style compact */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search issues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-muted/50 border-border"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[130px] h-9 bg-muted/50 border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="UNRESOLVED">Unresolved</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="IGNORED">Ignored</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={levelFilter}
            onValueChange={(value) => {
              setLevelFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[110px] h-9 bg-muted/50 border-border">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="FATAL">Fatal</SelectItem>
              <SelectItem value="ERROR">Error</SelectItem>
              <SelectItem value="WARNING">Warning</SelectItem>
              <SelectItem value="INFO">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Issues List - Sentry style */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <div className="col-span-1 flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border bg-muted"
                checked={selectedIssues.size === filteredIssues.length && filteredIssues.length > 0}
                onChange={() => {
                  if (selectedIssues.size === filteredIssues.length) {
                    setSelectedIssues(new Set());
                  } else {
                    setSelectedIssues(new Set(filteredIssues.map(i => i.id)));
                  }
                }}
              />
            </div>
            <div className="col-span-5">Issue</div>
            <div className="col-span-2 text-center">Graph</div>
            <div className="col-span-1 text-center">Events</div>
            <div className="col-span-1 text-center">Users</div>
            <div className="col-span-2 text-right">Last Seen</div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3">
                  <div className="col-span-1">
                    <Skeleton className="h-4 w-4 rounded" />
                  </div>
                  <div className="col-span-5 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Skeleton className="h-4 w-6" />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <AlertTriangle className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-medium">No issues found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {search || statusFilter !== 'all' || levelFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Great job! No errors to report'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredIssues.map((issue, index) => {
                const level = levelConfig[issue.level] || levelConfig.INFO;
                const sparklineData = generateSparklineData();
                
                return (
                  <div
                    key={issue.id}
                    className="group grid grid-cols-12 gap-2 px-4 py-3 transition-colors hover:bg-muted/30 cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    {/* Checkbox */}
                    <div className="col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border bg-muted"
                        checked={selectedIssues.has(issue.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleIssueSelection(issue.id)}
                      />
                    </div>

                    {/* Issue Info */}
                    <div 
                      className="col-span-5 min-w-0"
                      onClick={() => router.push(`/issues/${issue.id}`)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`h-2 w-2 rounded-full ${level.dot}`} />
                        <span className="font-mono text-xs text-muted-foreground">
                          {issue.shortId}
                        </span>
                        {issue.status === 'RESOLVED' && (
                          <Badge variant="default" className="h-5 text-[10px]">
                            resolved
                          </Badge>
                        )}
                        {issue.status === 'IGNORED' && (
                          <Badge variant="secondary" className="h-5 text-[10px]">
                            ignored
                          </Badge>
                        )}
                      </div>
                      <p className="font-mono text-sm font-medium leading-tight truncate group-hover:text-primary transition-colors">
                        {issue.title}
                      </p>
                      {issue.culprit && (
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          {issue.culprit}
                        </p>
                      )}
                    </div>

                    {/* Sparkline Graph */}
                    <div 
                      className="col-span-2 flex items-center justify-center"
                      onClick={() => router.push(`/issues/${issue.id}`)}
                    >
                      <Sparkline data={sparklineData} level={issue.level} />
                    </div>

                    {/* Events */}
                    <div 
                      className="col-span-1 flex items-center justify-center"
                      onClick={() => router.push(`/issues/${issue.id}`)}
                    >
                      <span className="text-sm font-medium">
                        {issue.eventCount >= 1000 
                          ? `${(issue.eventCount / 1000).toFixed(1)}k`
                          : issue.eventCount}
                      </span>
                    </div>

                    {/* Users */}
                    <div 
                      className="col-span-1 flex items-center justify-center"
                      onClick={() => router.push(`/issues/${issue.id}`)}
                    >
                      <span className="text-sm text-muted-foreground">
                        {issue.userCount}
                      </span>
                    </div>

                    {/* Last Seen */}
                    <div 
                      className="col-span-2 flex items-center justify-end gap-2"
                      onClick={() => router.push(`/issues/${issue.id}`)}
                    >
                      <span className="text-sm text-muted-foreground">
                        {formatTimeAgo(issue.lastSeen)}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Add dropdown menu here later
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="h-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    className="h-8 w-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="h-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function IssuesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <IssuesPageContent />
    </Suspense>
  );
}
