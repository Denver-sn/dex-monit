'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
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
import { logsApi, projectsApi, Log, Project } from '@/lib/api-client';

const levelConfig: Record<string, { bg: string; text: string; border: string }> = {
  FATAL: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  ERROR: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  WARN: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  WARNING: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  INFO: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  DEBUG: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  TRACE: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function LogsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  const loadLogs = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const result = await logsApi.list({
        projectId: projectFilter !== 'all' ? projectFilter : undefined,
        level: levelFilter !== 'all' ? levelFilter : undefined,
        search: search || undefined,
        page,
        pageSize: 50,
      });

      setLogs(result.data);
      setTotalPages(result.meta.totalPages);
      setTotal(result.meta.total);
    } catch (err) {
      console.error('Failed to load logs:', err);
      setError('Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [user, projectFilter, levelFilter, search, page]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await projectsApi.list();
        setProjects(data || []);
      } catch {
        // Ignore
      }
    };
    if (user) {
      loadProjects();
    }
  }, [user]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadLogs, 5000);
      return () => clearInterval(interval);
    }
    return;
  }, [autoRefresh, loadLogs]);

  if (authLoading || !user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold tracking-tight">Logs</h1>
            <p className="text-sm text-muted-foreground">
              {total > 0 ? `${total.toLocaleString()} log entries` : 'Real-time application logs'}
            </p>
          </div>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Live' : 'Auto-refresh'}
          </Button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Filters Bar */}
        <div
          className="animate-fade-in flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
          style={{ animationDelay: '50ms' }}
        >
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-muted/50 border-0"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <Select
              value={projectFilter}
              onValueChange={(value) => {
                setProjectFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] bg-muted/50 border-0">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={levelFilter}
              onValueChange={(value) => {
                setLevelFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[120px] bg-muted/50 border-0">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="FATAL">Fatal</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="WARN">Warning</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="DEBUG">Debug</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Logs List */}
        <div
          className="animate-fade-in rounded-xl border border-border bg-card overflow-hidden"
          style={{ animationDelay: '100ms' }}
        >
          {loading ? (
            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-4 py-3">
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
                <FileText className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-medium">No logs found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {search || levelFilter !== 'all' || projectFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Logs will appear here when your app starts sending them'}
              </p>
            </div>
          ) : (
            <div className="font-mono text-sm">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <div className="col-span-2">Timestamp</div>
                <div className="col-span-1">Level</div>
                <div className="col-span-9">Message</div>
              </div>

              {/* Log entries */}
              <div className="divide-y divide-border/50">
                {logs.map((log) => {
                  const level = levelConfig[log.level] || levelConfig.INFO;
                  const isExpanded = expandedLog === log.id;

                  return (
                    <div key={log.id} className="group">
                      <div
                        className="grid grid-cols-12 gap-2 px-4 py-2 transition-colors hover:bg-muted/20 cursor-pointer"
                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                      >
                        {/* Timestamp */}
                        <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
                          <span className="text-xs opacity-60">{formatDate(log.timestamp)}</span>
                          <span>{formatTimestamp(log.timestamp)}</span>
                        </div>

                        {/* Level */}
                        <div className="col-span-1">
                          <Badge
                            className={`text-[10px] uppercase font-semibold ${level.bg} ${level.text} ${level.border}`}
                          >
                            {log.level.slice(0, 4)}
                          </Badge>
                        </div>

                        {/* Message */}
                        <div className="col-span-9 text-foreground truncate">
                          {log.message}
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="border-t border-border/50 bg-muted/10 px-4 py-4 space-y-3">
                          {/* Full message */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Message</p>
                            <div className="code-block p-3">
                              <pre className="whitespace-pre-wrap break-all">{log.message}</pre>
                            </div>
                          </div>

                          {/* Metadata */}
                          <div className="grid gap-3 sm:grid-cols-3">
                            {log.requestId && (
                              <div>
                                <p className="text-xs text-muted-foreground">Request ID</p>
                                <p className="text-sm">{log.requestId}</p>
                              </div>
                            )}
                            {log.transactionId && (
                              <div>
                                <p className="text-xs text-muted-foreground">Transaction ID</p>
                                <p className="text-sm">{log.transactionId}</p>
                              </div>
                            )}
                            {log.serviceName && (
                              <div>
                                <p className="text-xs text-muted-foreground">Service</p>
                                <p className="text-sm">{log.serviceName}</p>
                              </div>
                            )}
                          </div>

                          {/* Data */}
                          {log.data && Object.keys(log.data).length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Data</p>
                              <div className="code-block p-3">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(log.data, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {logs.length} of {total.toLocaleString()} logs
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="px-2 text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
