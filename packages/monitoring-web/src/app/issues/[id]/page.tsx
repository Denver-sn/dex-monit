'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Hash,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Globe,
  Server,
  Code,
  Layers,
  ArrowRight,
  Terminal,
  AlertCircle,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { issuesApi, Issue, Event } from '@/lib/api-client';

function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

const levelConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  FATAL: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-500' },
  ERROR: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', dot: 'bg-orange-500' },
  WARNING: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', dot: 'bg-yellow-500' },
  INFO: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-500' },
  DEBUG: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', dot: 'bg-purple-500' },
};

const platformConfig: Record<string, { icon: typeof Smartphone; label: string; color: string; bg: string }> = {
  'react-native': { icon: Smartphone, label: 'React Native', color: 'text-green-400', bg: 'bg-green-500/10' },
  'node': { icon: Server, label: 'Node.js', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  'browser': { icon: Globe, label: 'Browser', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  'javascript': { icon: Globe, label: 'Browser', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  'unknown': { icon: Monitor, label: 'Unknown', color: 'text-muted-foreground', bg: 'bg-muted' },
};

function getPlatformConfig(platform?: string) {
  if (!platform) return platformConfig.unknown;
  const key = platform.toLowerCase();
  return platformConfig[key] || platformConfig.unknown;
}

interface StackFrame {
  filename: string;
  function: string;
  lineno: number;
  colno: number;
  context?: string[];
}

export default function IssueDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [issue, setIssue] = useState<(Issue & { events: Event[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedFrames, setExpandedFrames] = useState<Record<number, boolean>>({});

  const issueId = params.id as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || !issueId) return;

    const loadIssue = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await issuesApi.get(issueId);
        setIssue(data);
      } catch (err) {
        console.error('Failed to load issue:', err);
        setError('Failed to load issue details');
      } finally {
        setLoading(false);
      }
    };

    loadIssue();
  }, [user, issueId]);

  const handleResolve = async () => {
    if (!issue) return;
    try {
      setActionLoading(true);
      const updated = await issuesApi.resolve(issue.id);
      setIssue({ ...issue, ...updated });
    } catch (err) {
      console.error('Failed to resolve issue:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleIgnore = async () => {
    if (!issue) return;
    try {
      setActionLoading(true);
      const updated = await issuesApi.ignore(issue.id);
      setIssue({ ...issue, ...updated });
    } catch (err) {
      console.error('Failed to ignore issue:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnresolve = async () => {
    if (!issue) return;
    try {
      setActionLoading(true);
      const updated = await issuesApi.unresolve(issue.id);
      setIssue({ ...issue, ...updated });
    } catch (err) {
      console.error('Failed to unresolve issue:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const copyIssueId = () => {
    if (issue) {
      navigator.clipboard.writeText(issue.shortId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleFrame = (index: number) => {
    setExpandedFrames((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const parseStacktrace = (stacktrace: unknown): StackFrame[] => {
    if (!stacktrace) return [];
    if (Array.isArray(stacktrace)) return stacktrace;
    if (typeof stacktrace === 'string') {
      const lines = stacktrace.split('\n');
      return lines.slice(1).map((line) => {
        const match = line.match(/at\s+(?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+))\)?/);
        if (match) {
          return {
            function: match[1] || '<anonymous>',
            filename: match[2] || '<unknown>',
            lineno: parseInt(match[3] || '0', 10),
            colno: parseInt(match[4] || '0', 10),
          };
        }
        return {
          function: line.trim(),
          filename: '',
          lineno: 0,
          colno: 0,
        };
      }).filter((f) => f.filename || f.function);
    }
    return [];
  };

  if (authLoading || !user) {
    return null;
  }

  const level = issue ? levelConfig[issue.level] || levelConfig.INFO : levelConfig.INFO;
  const latestEvent = issue?.events?.[0];
  const stackFrames = parseStacktrace(latestEvent?.stacktrace);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="animate-fade-in flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => router.push('/issues')}
            className="hover:text-foreground transition-colors"
          >
            Issues
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{issue?.shortId || issueId}</span>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        ) : issue ? (
          <>
            {/* Issue Header - Sentry Style */}
            <div className="animate-fade-in rounded-xl border border-border bg-card overflow-hidden">
              {/* Status Bar */}
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${level.dot}`} />
                  <Badge className={`uppercase font-mono text-xs ${level.bg} ${level.text} ${level.border}`}>
                    {issue.level}
                  </Badge>
                  <Badge
                    variant={
                      issue.status === 'UNRESOLVED'
                        ? 'destructive'
                        : issue.status === 'RESOLVED'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {issue.status.toLowerCase()}
                  </Badge>
                  {/* Platform Badge */}
                  {(() => {
                    const platformCfg = getPlatformConfig(issue.platform);
                    const PlatformIcon = platformCfg.icon;
                    return (
                      <Badge className={`${platformCfg.bg} ${platformCfg.color} border-0`}>
                        <PlatformIcon className="mr-1 h-3 w-3" />
                        {platformCfg.label}
                      </Badge>
                    );
                  })()}
                  <button
                    onClick={copyIssueId}
                    className="flex items-center gap-1.5 font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {issue.shortId}
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {issue.status === 'UNRESOLVED' ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actionLoading}
                        onClick={handleIgnore}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Ignore
                      </Button>
                      <Button
                        size="sm"
                        disabled={actionLoading}
                        onClick={handleResolve}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Resolve
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading}
                      onClick={handleUnresolve}
                    >
                      Reopen Issue
                    </Button>
                  )}
                </div>
              </div>

              {/* Error Title */}
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${level.bg}`}>
                    <AlertCircle className={`h-5 w-5 ${level.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="font-mono text-lg font-semibold leading-tight break-all">
                      {issue.title}
                    </h1>
                    {issue.culprit && (
                      <p className="mt-2 font-mono text-sm text-muted-foreground truncate">
                        {issue.culprit}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="mt-6 flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hash className="h-4 w-4" />
                    <span className="font-semibold text-foreground">{issue.eventCount.toLocaleString()}</span>
                    <span>events</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span className="font-semibold text-foreground">{issue.userCount.toLocaleString()}</span>
                    <span>users</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>First seen {formatRelativeTime(issue.firstSeen)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Last seen {formatRelativeTime(issue.lastSeen)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column - Stack Trace & Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Stack Trace */}
                <div className="animate-fade-in rounded-xl border border-border bg-card overflow-hidden" style={{ animationDelay: '50ms' }}>
                  <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-3">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium">Stack Trace</h3>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {stackFrames.length} frames
                    </Badge>
                  </div>

                  <div className="divide-y divide-border">
                    {stackFrames.length > 0 ? (
                      stackFrames.map((frame, index) => (
                        <div key={index} className="group">
                          <button
                            onClick={() => toggleFrame(index)}
                            className="flex w-full items-center gap-4 px-6 py-3 text-left hover:bg-muted/30 transition-colors"
                          >
                            <ChevronDown
                              className={`h-4 w-4 text-muted-foreground transition-transform ${
                                expandedFrames[index] ? 'rotate-0' : '-rotate-90'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-sm font-medium text-primary truncate">
                                {frame.function}
                              </p>
                              <p className="font-mono text-xs text-muted-foreground truncate">
                                {frame.filename}
                                {frame.lineno > 0 && (
                                  <span className="text-yellow-500">:{frame.lineno}</span>
                                )}
                                {frame.colno > 0 && (
                                  <span className="text-yellow-500">:{frame.colno}</span>
                                )}
                              </p>
                            </div>
                            <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                              {index === 0 ? 'origin' : `#${index}`}
                            </Badge>
                          </button>
                          {expandedFrames[index] && (
                            <div className="bg-[#0d0d1a] border-t border-border/50 overflow-hidden">
                              {frame.context && frame.context.length > 0 ? (
                                <div className="overflow-x-auto">
                                  <div className="min-w-max">
                                    {frame.context.map((line, lineIndex) => {
                                      const isErrorLine = line.startsWith('>');
                                      // Parse line number from format "> 1234 | code"
                                      const lineMatch = line.match(/^([> ]) (\d+) \| (.*)$/);
                                      const lineNum = lineMatch ? lineMatch[2] : '';
                                      const code = lineMatch ? lineMatch[3] : line;
                                      
                                      return (
                                        <div
                                          key={lineIndex}
                                          className={`flex font-mono text-xs ${
                                            isErrorLine 
                                              ? 'bg-red-500/20 border-l-2 border-red-500' 
                                              : 'hover:bg-muted/10'
                                          }`}
                                        >
                                          <span className={`w-14 px-3 py-0.5 text-right select-none shrink-0 ${
                                            isErrorLine ? 'text-red-400 bg-red-500/10' : 'text-muted-foreground/50'
                                          }`}>
                                            {lineNum}
                                          </span>
                                          <pre className={`flex-1 px-4 py-0.5 ${
                                            isErrorLine ? 'text-foreground' : 'text-muted-foreground'
                                          }`}>
                                            {code}
                                          </pre>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div className="px-6 py-4 space-y-3">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">File</p>
                                      <p className="font-mono text-xs break-all text-foreground">{frame.filename || 'Unknown'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Function</p>
                                      <p className="font-mono text-xs text-primary">{frame.function || '<anonymous>'}</p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Line</p>
                                      <p className="font-mono text-xs text-yellow-500">{frame.lineno || '-'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Column</p>
                                      <p className="font-mono text-xs text-yellow-500">{frame.colno || '-'}</p>
                                    </div>
                                  </div>
                                  {!frame.filename?.includes('node_modules') && (
                                    <div className="pt-2 border-t border-border/30">
                                      <p className="text-xs text-muted-foreground">
                                        💡 Source code not available - the SDK needs access to the source files
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-6 py-12 text-center">
                        <Terminal className="mx-auto h-8 w-8 text-muted-foreground/50" />
                        <p className="mt-2 text-sm text-muted-foreground">
                          No stack trace available
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Breadcrumbs */}
                <div className="animate-fade-in rounded-xl border border-border bg-card overflow-hidden" style={{ animationDelay: '100ms' }}>
                  <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-6 py-3">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Breadcrumbs</h3>
                    {latestEvent?.breadcrumbs && (
                      <Badge variant="outline" className="ml-auto font-mono text-xs">
                        {latestEvent.breadcrumbs.length} entries
                      </Badge>
                    )}
                  </div>
                  <div className="divide-y divide-border max-h-96 overflow-y-auto">
                    {latestEvent?.breadcrumbs && latestEvent.breadcrumbs.length > 0 ? (
                      latestEvent.breadcrumbs.map((crumb, index) => {
                        const crumbLevel = levelConfig[crumb.level?.toUpperCase() || 'INFO'] || levelConfig.INFO;
                        return (
                          <div
                            key={index}
                            className="flex items-start gap-4 px-6 py-3 hover:bg-muted/20"
                          >
                            <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${crumbLevel.dot}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] uppercase">
                                  {crumb.category}
                                </Badge>
                                {crumb.type && crumb.type !== 'default' && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {crumb.type}
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-1 font-mono text-sm truncate">
                                {crumb.message || JSON.stringify(crumb.data)}
                              </p>
                              {crumb.data && crumb.type === 'http' && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {(crumb.data as { method?: string; url?: string; status_code?: number }).method}{' '}
                                  {(crumb.data as { method?: string; url?: string; status_code?: number }).url}{' '}
                                  [{(crumb.data as { method?: string; url?: string; status_code?: number }).status_code}]
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                              {formatRelativeTime(crumb.timestamp)}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                        No breadcrumbs recorded
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Context */}
              <div className="space-y-6">
                {/* HTTP Request */}
                {latestEvent && (latestEvent.requestUrl || latestEvent.requestMethod) && (
                  <div className="animate-fade-in rounded-xl border border-border bg-card overflow-hidden" style={{ animationDelay: '150ms' }}>
                    <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-6 py-3">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium">HTTP Request</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {latestEvent.requestMethod && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {latestEvent.requestMethod}
                          </Badge>
                          <p className="font-mono text-sm break-all text-muted-foreground">
                            {latestEvent.requestUrl || '-'}
                          </p>
                        </div>
                      )}
                      {latestEvent.requestData && (
                        <>
                          {(latestEvent.requestData as any).body && (
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                                Body
                              </p>
                              <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                                <pre>{JSON.stringify((latestEvent.requestData as any).body, null, 2)}</pre>
                              </div>
                            </div>
                          )}
                          {(latestEvent.requestData as any).headers && (
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                                Headers
                              </p>
                              <div className="space-y-1">
                                {Object.entries((latestEvent.requestData as any).headers || {}).slice(0, 8).map(([key, value]) => (
                                  <div key={key} className="flex items-start gap-2 text-xs">
                                    <span className="text-muted-foreground shrink-0">{key}:</span>
                                    <span className="font-mono break-all">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Environment */}
                <div className="animate-fade-in rounded-xl border border-border bg-card overflow-hidden" style={{ animationDelay: '200ms' }}>
                  <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-6 py-3">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Environment</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {[
                      { label: 'Platform', value: issue.platform },
                      { label: 'Environment', value: latestEvent?.environment || '-' },
                      { label: 'Server', value: latestEvent?.serverName || '-' },
                      { label: 'Release', value: latestEvent?.release || '-' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between px-6 py-3">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <span className="font-mono text-sm">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="animate-fade-in rounded-xl border border-border bg-card overflow-hidden" style={{ animationDelay: '250ms' }}>
                  <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-6 py-3">
                    <Code className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Tags</h3>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(latestEvent?.tags || latestEvent?.contexts?.tags || issue.tags || {}).map(([key, value]) => (
                        <Badge key={key} variant="secondary" className="gap-1">
                          <span className="text-muted-foreground">{key}:</span>
                          <span>{String(value)}</span>
                        </Badge>
                      ))}
                      {(!latestEvent?.tags && !latestEvent?.contexts?.tags && !issue.tags) && (
                        <p className="text-sm text-muted-foreground">No tags</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contexts */}
                {latestEvent?.contexts && (
                  <div className="animate-fade-in rounded-xl border border-border bg-card overflow-hidden" style={{ animationDelay: '300ms' }}>
                    <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-6 py-3">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium">Contexts</h3>
                    </div>
                    <div className="divide-y divide-border">
                      {latestEvent.contexts.runtime && (
                        <div className="px-6 py-3">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Runtime</p>
                          <p className="font-mono text-sm">{latestEvent.contexts.runtime.name} {latestEvent.contexts.runtime.version}</p>
                        </div>
                      )}
                      {latestEvent.contexts.os && (
                        <div className="px-6 py-3">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">OS</p>
                          <p className="font-mono text-sm">{latestEvent.contexts.os.name} {latestEvent.contexts.os.version}</p>
                        </div>
                      )}
                      {latestEvent.contexts.device && (
                        <div className="px-6 py-3">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Device</p>
                          <div className="space-y-1 text-sm">
                            {latestEvent.contexts.device.arch && (
                              <p><span className="text-muted-foreground">Arch:</span> {latestEvent.contexts.device.arch}</p>
                            )}
                            {latestEvent.contexts.device.cpus && (
                              <p><span className="text-muted-foreground">CPUs:</span> {latestEvent.contexts.device.cpus}</p>
                            )}
                            {latestEvent.contexts.device.hostname && (
                              <p><span className="text-muted-foreground">Host:</span> {latestEvent.contexts.device.hostname}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Mobile Device Info (from extra.deviceInfo) */}
                      {latestEvent.contexts.extra?.deviceInfo && (
                        <div className="px-6 py-3">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                            <Smartphone className="inline h-3 w-3 mr-1" />
                            Mobile Device
                          </p>
                          <div className="space-y-1 text-sm">
                            {(latestEvent.contexts.extra.deviceInfo as Record<string, unknown>).model && (
                              <p><span className="text-muted-foreground">Model:</span> {String((latestEvent.contexts.extra.deviceInfo as Record<string, unknown>).model)}</p>
                            )}
                            {(latestEvent.contexts.extra.deviceInfo as Record<string, unknown>).brand && (
                              <p><span className="text-muted-foreground">Brand:</span> {String((latestEvent.contexts.extra.deviceInfo as Record<string, unknown>).brand)}</p>
                            )}
                            {(latestEvent.contexts.extra.deviceInfo as Record<string, unknown>).systemName && (
                              <p><span className="text-muted-foreground">OS:</span> {String((latestEvent.contexts.extra.deviceInfo as Record<string, unknown>).systemName)} {String((latestEvent.contexts.extra.deviceInfo as Record<string, unknown>).systemVersion || '')}</p>
                            )}
                            {(latestEvent.contexts.extra.deviceInfo as Record<string, unknown>).appVersion && (
                              <p><span className="text-muted-foreground">App Version:</span> {String((latestEvent.contexts.extra.deviceInfo as Record<string, unknown>).appVersion)}</p>
                            )}
                            {(latestEvent.contexts.extra.deviceInfo as Record<string, unknown>).buildNumber && (
                              <p><span className="text-muted-foreground">Build:</span> {String((latestEvent.contexts.extra.deviceInfo as Record<string, unknown>).buildNumber)}</p>
                            )}
                            {(latestEvent.contexts.extra.deviceInfo as Record<string, unknown>).isTablet !== undefined && (
                              <p><span className="text-muted-foreground">Type:</span> {(latestEvent.contexts.extra.deviceInfo as Record<string, unknown>).isTablet ? 'Tablet' : 'Phone'}</p>
                            )}
                            {(latestEvent.contexts.extra.deviceInfo as Record<string, unknown>).isEmulator && (
                              <Badge variant="outline" className="mt-1 text-yellow-500 border-yellow-500/30">Emulator</Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <h3 className="text-lg font-semibold">Issue not found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The issue you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button className="mt-4" onClick={() => router.push('/issues')}>
              Back to Issues
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
