'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Key,
  Copy,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
  Activity,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { projectsApi, apiKeysApi, Project, ApiKey } from '@/lib/api-client';

const platformIcons: Record<string, string> = {
  node: '🟢',
  browser: '🌐',
  python: '🐍',
  go: '🔷',
  java: '☕',
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<{
    issueCount: number;
    eventCount: number;
    logCount: number;
  } | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createKeyDialogOpen, setCreateKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const projectId = params.id as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || !projectId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [projectData, statsData, keysData] = await Promise.all([
          projectsApi.get(projectId),
          projectsApi.getStats(projectId).catch(() => ({ issueCount: 0, eventCount: 0, logCount: 0 })),
          apiKeysApi.list(projectId).catch(() => []),
        ]);
        setProject(projectData);
        setStats(statsData);
        setApiKeys(keysData || []);
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, projectId]);

  const handleCreateApiKey = async () => {
    if (!newKeyName) return;

    try {
      setCreating(true);
      const created = await apiKeysApi.create(projectId, { name: newKeyName });
      setApiKeys([created, ...apiKeys]);
      setNewKeySecret(created.key);
      setNewKeyName('');
    } catch (err) {
      console.error('Failed to create API key:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;
    try {
      await apiKeysApi.delete(projectId, id);
      setApiKeys(apiKeys.filter((k) => k.id !== id));
    } catch (err) {
      console.error('Failed to delete API key:', err);
    }
  };

  const handleCloseKeyDialog = () => {
    setCreateKeyDialogOpen(false);
    setNewKeySecret(null);
    setNewKeyName('');
  };

  if (authLoading || !user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="animate-fade-in flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => router.push('/projects')}
            className="hover:text-foreground transition-colors"
          >
            Projects
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{project?.name || 'Loading...'}</span>
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
        ) : project ? (
          <>
            {/* Project Header */}
            <div className="animate-fade-in rounded-xl border border-border bg-card p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-3xl">
                  {platformIcons[project.platform] || '📦'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">{project.name}</h1>
                    <Badge variant="secondary">{project.platform}</Badge>
                  </div>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">
                    {project.slug}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wider">Issues</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{stats?.issueCount || 0}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wider">Events</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{stats?.eventCount || 0}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Key className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wider">API Keys</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{apiKeys.length}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wider">Status</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-emerald-400">Active</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="api-keys" className="animate-fade-in" style={{ animationDelay: '100ms' }}>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="api-keys">API Keys</TabsTrigger>
                <TabsTrigger value="setup">SDK Setup</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="api-keys" className="mt-4">
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
                    <div>
                      <h2 className="font-semibold">API Keys</h2>
                      <p className="text-sm text-muted-foreground">
                        Manage authentication keys for your SDK
                      </p>
                    </div>
                    <Dialog open={createKeyDialogOpen} onOpenChange={setCreateKeyDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                          <Plus className="h-4 w-4" />
                          Create Key
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>
                            {newKeySecret ? '🔑 API Key Created!' : 'Create API Key'}
                          </DialogTitle>
                          <DialogDescription>
                            {newKeySecret
                              ? 'Make sure to copy your API key now. You won\'t be able to see it again!'
                              : 'Create a new API key for SDK authentication.'}
                          </DialogDescription>
                        </DialogHeader>
                        {newKeySecret ? (
                          <div className="space-y-4 py-4">
                            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                              <Label className="text-xs text-muted-foreground">Your API Key</Label>
                              <div className="mt-2 flex items-center gap-2">
                                <code className="flex-1 rounded bg-background p-3 font-mono text-sm break-all">
                                  {newKeySecret}
                                </code>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleCopyKey(newKeySecret)}
                                >
                                  {copiedKey === newKeySecret ? (
                                    <Check className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
                              <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-yellow-500">
                                  Store this key securely
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  This is the only time you&apos;ll see this key. Add it to your environment variables.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="keyName">Key Name</Label>
                              <Input
                                id="keyName"
                                placeholder="e.g., Production, Staging, Development"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                className="bg-muted/50"
                              />
                              <p className="text-xs text-muted-foreground">
                                A descriptive name to identify this key
                              </p>
                            </div>
                          </div>
                        )}
                        <DialogFooter>
                          {newKeySecret ? (
                            <Button onClick={handleCloseKeyDialog}>Done</Button>
                          ) : (
                            <>
                              <Button variant="outline" onClick={handleCloseKeyDialog}>
                                Cancel
                              </Button>
                              <Button
                                onClick={handleCreateApiKey}
                                disabled={!newKeyName || creating}
                              >
                                {creating ? 'Creating...' : 'Create Key'}
                              </Button>
                            </>
                          )}
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {apiKeys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                        <Key className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="mt-4 font-medium">No API keys</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Create an API key to authenticate your SDK
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {apiKeys.map((apiKey) => (
                        <div
                          key={apiKey.id}
                          className="flex items-center justify-between px-6 py-4 hover:bg-muted/20"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                              apiKey.isActive ? 'bg-emerald-500/10' : 'bg-muted'
                            }`}>
                              <Key className={`h-5 w-5 ${
                                apiKey.isActive ? 'text-emerald-400' : 'text-muted-foreground'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium">{apiKey.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="text-xs text-muted-foreground">
                                  {apiKey.keyPrefix}••••••••
                                </code>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">
                                  Created {new Date(apiKey.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={apiKey.isActive ? 'default' : 'secondary'}>
                              {apiKey.isActive ? 'Active' : 'Revoked'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteKey(apiKey.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="setup" className="mt-4">
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="border-b border-border bg-muted/30 px-6 py-4">
                    <h2 className="font-semibold">SDK Setup</h2>
                    <p className="text-sm text-muted-foreground">
                      Add the Dex SDK to your application
                    </p>
                  </div>
                  <div className="p-6 space-y-6">
                    {/* Install */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">1. Install the SDK</h3>
                      <div className="code-block">
                        <pre className="text-sm">npm install @dex-monit/observability-sdk-node</pre>
                      </div>
                    </div>

                    {/* Configure */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">2. Configure in your app</h3>
                      <div className="code-block">
                        <pre className="text-sm">{`import { SdkNodeModule } from '@dex-monit/observability-sdk-node';

@Module({
  imports: [
    SdkNodeModule.forRoot({
      logger: {
        name: '${project.slug}',
        level: 'info',
      },
      monitoring: {
        apiUrl: process.env.MONITORING_API_URL,
        apiKey: process.env.DEX_API_KEY,
        project: '${project.slug}',
        environment: process.env.NODE_ENV,
      },
    }),
  ],
})
export class AppModule {}`}</pre>
                      </div>
                    </div>

                    {/* Env vars */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">3. Set environment variables</h3>
                      <div className="code-block">
                        <pre className="text-sm">{`MONITORING_API_URL=http://localhost:3000/api
DEX_API_KEY=your_api_key_here`}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="mt-4">
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="border-b border-border bg-muted/30 px-6 py-4">
                    <h2 className="font-semibold">Project Settings</h2>
                    <p className="text-sm text-muted-foreground">
                      Configure project preferences
                    </p>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="space-y-2">
                      <Label>Project Name</Label>
                      <Input defaultValue={project.name} className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Project Slug</Label>
                      <Input defaultValue={project.slug} disabled className="bg-muted/30" />
                      <p className="text-xs text-muted-foreground">
                        Project slug cannot be changed
                      </p>
                    </div>
                    <Button>Save Changes</Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <h3 className="text-lg font-semibold">Project not found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The project you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button className="mt-4" onClick={() => router.push('/projects')}>
              Back to Projects
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
