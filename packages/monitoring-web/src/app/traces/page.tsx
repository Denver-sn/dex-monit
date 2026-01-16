'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Zap,
  TrendingUp,
  Globe,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  RefreshCw,
  Copy,
  Check,
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
import { Switch } from '@/components/ui/switch';
import {
  tracesApi,
  projectsApi,
  HttpTrace,
  TraceStats,
  Project,
} from '@/lib/api-client';

function formatDuration(ms: number | undefined | null): string {
  if (ms === undefined || ms === null || isNaN(ms)) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

function formatTimeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s ago`;
  if (seconds > 0) return `${seconds}s ago`;
  return 'just now';
}

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PUT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  PATCH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  HEAD: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  OPTIONS: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const getStatusColor = (status: number): string => {
  if (status >= 500) return 'text-red-400 bg-red-500/10';
  if (status >= 400) return 'text-amber-400 bg-amber-500/10';
  if (status >= 300) return 'text-blue-400 bg-blue-500/10';
  if (status >= 200) return 'text-emerald-400 bg-emerald-500/10';
  return 'text-gray-400 bg-gray-500/10';
};

const getDurationColor = (ms: number | undefined | null): string => {
  if (ms === undefined || ms === null || isNaN(ms)) return 'text-muted-foreground';
  if (ms > 2000) return 'text-red-400';
  if (ms > 1000) return 'text-amber-400';
  if (ms > 500) return 'text-yellow-400';
  return 'text-emerald-400';
};

export default function TracesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [traces, setTraces] = useState<HttpTrace[]>([]);
  const [stats, setStats] = useState<TraceStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live mode
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Expanded rows
  const [expandedTraces, setExpandedTraces] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  // Load projects
  useEffect(() => {
    if (!user) return;

    const loadProjects = async () => {
      try {
        const projects = await projectsApi.list();
        setProjects(projects);
        if (projects.length > 0 && !selectedProject) {
          setSelectedProject(projects[0].id);
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
      }
    };

    loadProjects();
  }, [user]);

  // Load traces and stats
  const loadData = useCallback(async (showLoading = true) => {
    if (!user || !selectedProject) return;

    try {
      if (showLoading) setLoading(true);
      setError(null);

      const [tracesResult, statsResult] = await Promise.all([
        tracesApi.list({
          projectId: selectedProject,
          method: methodFilter !== 'all' ? methodFilter : undefined,
          hasError: statusFilter === 'error' ? true : statusFilter === 'success' ? false : undefined,
          path: search || undefined,
          page,
          pageSize: 100,
          sortBy: 'timestamp',
          sortOrder: 'desc',
        }),
        tracesApi.getStats({ projectId: selectedProject }),
      ]);

      setTraces(tracesResult.data);
      setTotalPages(tracesResult.meta.totalPages);
      setTotal(tracesResult.meta.total);
      setStats(statsResult);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to load traces:', err);
      setError('Failed to load traces');
    } finally {
      setLoading(false);
    }
  }, [user, selectedProject, methodFilter, statusFilter, search, page]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live polling
  useEffect(() => {
    if (isLive && selectedProject) {
      intervalRef.current = setInterval(() => {
        loadData(false);
      }, 2000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLive, selectedProject, loadData]);

  const toggleExpanded = (id: string) => {
    setExpandedTraces((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (authLoading || !user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="animate-fade-in">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">HTTP Traces</h1>
              {isLive && (
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs text-emerald-400 font-medium">LIVE</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {lastUpdate && `Last update: ${formatTimeAgo(lastUpdate.toISOString())}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Toggle */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              {isLive ? (
                <Wifi className="h-4 w-4 text-emerald-400" />
              ) : (
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm">Live</span>
              <Switch checked={isLive} onCheckedChange={setIsLive} />
            </div>

            {/* Manual Refresh */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => loadData()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            {/* Project Selector */}
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 animate-fade-in" style={{ animationDelay: '50ms' }}>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Requests</p>
                </div>
                <Activity className="h-8 w-8 text-primary/50" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</p>
                  <p className="text-xs text-muted-foreground">Avg Duration</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500/50" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{formatDuration(stats.p95Duration)}</p>
                  <p className="text-xs text-muted-foreground">P95 Latency</p>
                </div>
                <Zap className="h-8 w-8 text-orange-500/50" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.requestsPerMinute}/min</p>
                  <p className="text-xs text-muted-foreground">Throughput</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500/50" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold ${stats.errorRate > 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {stats.errorRate}%
                  </p>
                  <p className="text-xs text-muted-foreground">Error Rate</p>
                </div>
                {stats.errorRate > 5 ? (
                  <AlertTriangle className="h-8 w-8 text-red-500/50" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-emerald-500/50" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div
          className="animate-fade-in flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
          style={{ animationDelay: '100ms' }}
        >
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter by path..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-muted/50 border-0"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <Select
              value={methodFilter}
              onValueChange={(value) => {
                setMethodFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[120px] bg-muted/50 border-0">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[120px] bg-muted/50 border-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">2xx Success</SelectItem>
                <SelectItem value="error">4xx/5xx Errors</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">
            {total.toLocaleString()} traces
          </div>
        </div>

        {/* Live Traces Stream */}
        <div
          className="animate-fade-in rounded-xl border border-border bg-card overflow-hidden"
          style={{ animationDelay: '150ms' }}
        >
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <div className="col-span-1">Time</div>
            <div className="col-span-1">Method</div>
            <div className="col-span-4">Path</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-2 text-center">Duration</div>
            <div className="col-span-2">Client</div>
            <div className="col-span-1"></div>
          </div>

          {/* Loading State */}
          {loading && traces.length === 0 ? (
            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-14 rounded" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-6 w-12 ml-auto rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : traces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <Globe className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-medium">No traces yet</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
                HTTP traces will appear here in real-time once your SDK starts sending data
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {traces.map((trace, index) => {
                const isExpanded = expandedTraces.has(trace.id);
                const isNew = index < 3 && isLive;

                return (
                  <div key={trace.id} className={isNew ? 'animate-pulse-once' : ''}>
                    {/* Main Row */}
                    <div
                      className={`grid grid-cols-12 gap-2 px-4 py-2.5 transition-colors hover:bg-muted/20 cursor-pointer ${
                        isExpanded ? 'bg-muted/30' : ''
                      }`}
                      onClick={() => toggleExpanded(trace.id)}
                    >
                      {/* Time */}
                      <div className="col-span-1 flex items-center">
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatTime(trace.timestamp)}
                        </span>
                      </div>

                      {/* Method */}
                      <div className="col-span-1 flex items-center">
                        <Badge className={`text-[10px] font-bold ${methodColors[trace.method] || 'bg-muted'}`}>
                          {trace.method}
                        </Badge>
                      </div>

                      {/* Path */}
                      <div className="col-span-4 flex items-center min-w-0">
                        <span className="font-mono text-sm truncate">{trace.path}</span>
                      </div>

                      {/* Status */}
                      <div className="col-span-1 flex items-center justify-center">
                        <span className={`font-mono text-sm font-bold px-2 py-0.5 rounded ${getStatusColor(trace.statusCode)}`}>
                          {trace.statusCode}
                        </span>
                      </div>

                      {/* Duration */}
                      <div className="col-span-2 flex items-center justify-center">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                trace.duration > 2000 ? 'bg-red-500' :
                                trace.duration > 1000 ? 'bg-amber-500' :
                                trace.duration > 500 ? 'bg-yellow-500' :
                                'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, (trace.duration / 2000) * 100)}%` }}
                            />
                          </div>
                          <span className={`font-mono text-xs font-medium ${getDurationColor(trace.duration)}`}>
                            {formatDuration(trace.duration)}
                          </span>
                        </div>
                      </div>

                      {/* Client */}
                      <div className="col-span-2 flex items-center">
                        <span className="text-xs text-muted-foreground font-mono truncate">
                          {trace.ip || '-'}
                        </span>
                      </div>

                      {/* Expand */}
                      <div className="col-span-1 flex items-center justify-end">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-border bg-[#0a0a12] px-4 py-4">
                        <div className="grid grid-cols-2 gap-6">
                          {/* Left Column */}
                          <div className="space-y-4">
                            {/* Request Info */}
                            <div>
                              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                                Request
                              </h4>
                              <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge className={methodColors[trace.method]}>
                                    {trace.method}
                                  </Badge>
                                  <span className="font-mono text-sm flex-1 truncate">{trace.url}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(trace.url, trace.id + '-url');
                                    }}
                                  >
                                    {copiedId === trace.id + '-url' ? (
                                      <Check className="h-3 w-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                                {trace.contentType && (
                                  <div className="text-xs text-muted-foreground">
                                    Content-Type: <span className="text-foreground">{trace.contentType}</span>
                                  </div>
                                )}
                                {trace.contentLength && (
                                  <div className="text-xs text-muted-foreground">
                                    Content-Length: <span className="text-foreground">{trace.contentLength} bytes</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Query Parameters */}
                            {trace.query && Object.keys(trace.query).length > 0 && (
                              <div>
                                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                                  Query Parameters
                                </h4>
                                <div className="rounded-lg bg-muted/30 p-3 font-mono text-xs space-y-1">
                                  {Object.entries(trace.query).map(([key, value]) => (
                                    <div key={key} className="flex">
                                      <span className="text-primary">{key}</span>
                                      <span className="text-muted-foreground mx-1">=</span>
                                      <span className="text-foreground">{String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Headers */}
                            {trace.headers && Object.keys(trace.headers).length > 0 && (
                              <div>
                                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                                  Headers
                                </h4>
                                <div className="rounded-lg bg-muted/30 p-3 font-mono text-xs space-y-1 max-h-40 overflow-y-auto">
                                  {Object.entries(trace.headers).map(([key, value]) => (
                                    <div key={key} className="flex">
                                      <span className="text-amber-400">{key}</span>
                                      <span className="text-muted-foreground mx-1">:</span>
                                      <span className="text-foreground truncate">{String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right Column */}
                          <div className="space-y-4">
                            {/* Response Info */}
                            <div>
                              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                                Response
                              </h4>
                              <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Status</span>
                                  <span className={`font-mono font-bold px-2 py-0.5 rounded ${getStatusColor(trace.statusCode)}`}>
                                    {trace.statusCode}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Duration</span>
                                  <span className={`font-mono font-medium ${getDurationColor(trace.duration)}`}>
                                    {formatDuration(trace.duration)}
                                  </span>
                                </div>
                                {trace.responseSize && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Size</span>
                                    <span className="font-mono text-sm">{trace.responseSize} bytes</span>
                                  </div>
                                )}
                                {trace.error && (
                                  <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                                    <span className="text-xs text-red-400">{trace.error}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Timing Breakdown */}
                            <div>
                              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                                Timing
                              </h4>
                              <div className="rounded-lg bg-muted/30 p-3">
                                <div className="h-4 rounded-full overflow-hidden flex">
                                  <div
                                    className="bg-blue-500 h-full"
                                    style={{ width: '10%' }}
                                    title="DNS"
                                  />
                                  <div
                                    className="bg-emerald-500 h-full"
                                    style={{ width: '15%' }}
                                    title="Connect"
                                  />
                                  <div
                                    className="bg-amber-500 h-full"
                                    style={{ width: '20%' }}
                                    title="TLS"
                                  />
                                  <div
                                    className="bg-purple-500 h-full flex-1"
                                    title="Server"
                                  />
                                </div>
                                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    DNS
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Connect
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                    TLS
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                                    Server
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Client Info */}
                            <div>
                              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                                Client
                              </h4>
                              <div className="rounded-lg bg-muted/30 p-3 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">IP Address</span>
                                  <span className="font-mono">{trace.ip || '-'}</span>
                                </div>
                                {trace.userAgent && (
                                  <div>
                                    <span className="text-muted-foreground">User Agent</span>
                                    <p className="font-mono text-[10px] text-foreground mt-1 break-all">
                                      {trace.userAgent}
                                    </p>
                                  </div>
                                )}
                                {trace.referer && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Referer</span>
                                    <span className="font-mono truncate max-w-[200px]">{trace.referer}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* IDs */}
                            <div className="flex gap-2">
                              {trace.requestId && (
                                <Badge variant="outline" className="font-mono text-[10px]">
                                  req: {trace.requestId.slice(0, 8)}...
                                </Badge>
                              )}
                              {trace.transactionId && (
                                <Badge variant="outline" className="font-mono text-[10px]">
                                  tx: {trace.transactionId.slice(0, 8)}...
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
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

      <style jsx>{`
        @keyframes pulse-once {
          0% { background-color: rgba(16, 185, 129, 0.2); }
          100% { background-color: transparent; }
        }
        .animate-pulse-once {
          animation: pulse-once 1s ease-out;
        }
      `}</style>
    </AppLayout>
  );
}
