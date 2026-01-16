'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Trash2 } from 'lucide-react';
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
import { teamsApi, Team } from '@/lib/api-client';

export default function TeamsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', slug: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const loadTeams = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await teamsApi.list();
        setTeams(data || []);
      } catch (err) {
        console.error('Failed to load teams:', err);
        setError('Failed to load teams');
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, [user]);

  const handleCreateTeam = async () => {
    if (!newTeam.name) return;

    try {
      setCreating(true);
      const slug = newTeam.slug || newTeam.name.toLowerCase().replace(/\s+/g, '-');
      const created = await teamsApi.create({
        name: newTeam.name,
        slug,
      });
      setTeams([...teams, created]);
      setNewTeam({ name: '', slug: '' });
      setCreateDialogOpen(false);
    } catch (err) {
      console.error('Failed to create team:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team? All projects within it will also be deleted.')) return;
    
    try {
      await teamsApi.delete(id);
      setTeams(teams.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Failed to delete team:', err);
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
            <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
            <p className="text-sm text-muted-foreground">
              {teams.length > 0
                ? `${teams.length} team${teams.length > 1 ? 's' : ''}`
                : 'Organize your projects with teams'}
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Team</DialogTitle>
                <DialogDescription>
                  Create a team to organize your projects and collaborate.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Team Name</Label>
                  <Input
                    id="name"
                    placeholder="Engineering"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (optional)</Label>
                  <Input
                    id="slug"
                    placeholder="engineering"
                    value={newTeam.slug}
                    onChange={(e) => setNewTeam({ ...newTeam, slug: e.target.value })}
                    className="bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used in URLs. Auto-generated if left empty.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTeam}
                  disabled={!newTeam.name || creating}
                >
                  {creating ? 'Creating...' : 'Create Team'}
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

        {/* Teams List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6">
                <Skeleton className="h-20" />
              </div>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="animate-fade-in rounded-xl border border-border bg-card p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mt-4 text-lg font-medium">No teams yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first team to start organizing projects.
            </p>
            <Button className="mt-4 gap-2" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Team
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {teams.map((team, index) => (
              <div
                key={team.id}
                className="animate-fade-in rounded-xl border border-border bg-card overflow-hidden"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{team.name}</h3>
                      <p className="text-sm text-muted-foreground font-mono">
                        {team.slug}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold">{team._count?.projects || 0}</p>
                      <p className="text-xs text-muted-foreground">projects</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteTeam(team.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Team Members */}
                <div className="border-t border-border bg-muted/20 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Members:</span>
                      <div className="flex -space-x-2">
                        {(team.members || []).slice(0, 5).map((member, i) => (
                          <div
                            key={member.userId || i}
                            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-gradient-to-br from-primary/80 to-purple-500/80 text-xs font-semibold text-white"
                            title={member.user?.name || member.user?.email}
                          >
                            {member.user?.name?.charAt(0).toUpperCase() || 
                             member.user?.email?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        ))}
                        {(team.members?.length || 0) > 5 && (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium">
                            +{team.members!.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {team.members?.length || 1} member{(team.members?.length || 1) > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
