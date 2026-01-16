'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, AlertTriangle, ArrowRight, Layers } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { projectsApi, teamsApi, Project, Team } from '@/lib/api-client';

const platformIcons: Record<string, string> = {
  node: '🟢',
  browser: '🌐',
  python: '🐍',
  go: '🔷',
  java: '☕',
};

export default function ProjectsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    slug: '',
    teamId: '',
    platform: 'node',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [projectsData, teamsData] = await Promise.all([
          projectsApi.list().catch(() => []),
          teamsApi.list().catch(() => []),
        ]);
        setProjects(projectsData || []);
        setTeams(teamsData || []);
      } catch (err) {
        console.error('Failed to load projects:', err);
        setError('Failed to load projects');
        setProjects([]);
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.teamId) return;

    try {
      setCreating(true);
      const slug = newProject.slug || newProject.name.toLowerCase().replace(/\s+/g, '-');
      const created = await projectsApi.create({
        name: newProject.name,
        slug,
        teamId: newProject.teamId,
        platform: newProject.platform,
      });
      setProjects([...projects, created]);
      setNewProject({ name: '', slug: '', teamId: '', platform: 'node' });
      setCreateDialogOpen(false);
      router.push(`/projects/${created.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setCreating(false);
    }
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
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground">
              {projects.length > 0
                ? `${projects.length} project${projects.length > 1 ? 's' : ''} configured`
                : 'Create your first project to start monitoring'}
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={teams.length === 0}>
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Project</DialogTitle>
                <DialogDescription>
                  Add a new project to start monitoring your application.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    placeholder="My Application"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (optional)</Label>
                  <Input
                    id="slug"
                    placeholder="my-application"
                    value={newProject.slug}
                    onChange={(e) => setNewProject({ ...newProject, slug: e.target.value })}
                    className="bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used in URLs and SDK configuration
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Team</Label>
                  <Select
                    value={newProject.teamId}
                    onValueChange={(value) => setNewProject({ ...newProject, teamId: value })}
                  >
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select
                    value={newProject.platform}
                    onValueChange={(value) => setNewProject({ ...newProject, platform: value })}
                  >
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="node">🟢 Node.js</SelectItem>
                      <SelectItem value="browser">🌐 Browser</SelectItem>
                      <SelectItem value="python">🐍 Python</SelectItem>
                      <SelectItem value="go">🔷 Go</SelectItem>
                      <SelectItem value="java">☕ Java</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateProject}
                  disabled={!newProject.name || !newProject.teamId || creating}
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* No Teams Warning */}
        {teams.length === 0 && !loading && (
          <div className="animate-fade-in rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-yellow-400">Create a team first</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  You need to create a team before you can create projects.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push('/teams')}
                >
                  Go to Teams
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6">
                <Skeleton className="h-32" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 && teams.length > 0 ? (
          <div className="animate-fade-in rounded-xl border border-border bg-card p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <Layers className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mt-4 text-lg font-medium">No projects yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first project to start monitoring your application.
            </p>
            <Button className="mt-4 gap-2" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <div
                key={project.id}
                className="animate-fade-in group cursor-pointer rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                    {platformIcons[project.platform] || '📦'}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {project.platform}
                  </Badge>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">
                    {project.slug}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{project._count?.issues || 0} issues</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
