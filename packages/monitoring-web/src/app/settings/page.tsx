'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Bell,
  Shield,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  settingsApi,
  teamsApi,
  SlackConfig,
  EmailConfig,
  Team,
} from '@/lib/api-client';

// Slack icon component
const SlackIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
  </svg>
);

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [, setLoading] = useState(true);

  const [slackConfig, setSlackConfig] = useState<SlackConfig>({
    webhookUrl: '',
    channel: '#alerts',
    enabled: false,
  });

  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: 'Dex Monitoring',
    enabled: false,
  });

  const [savingSlack, setSavingSlack] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [slackTestStatus, setSlackTestStatus] = useState<TestStatus>('idle');
  const [slackTestError, setSlackTestError] = useState<string | null>(null);
  const [emailTestStatus, setEmailTestStatus] = useState<TestStatus>('idle');
  const [emailTestError, setEmailTestError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  // Load teams
  useEffect(() => {
    if (!user) return;

    const loadTeams = async () => {
      try {
        const result = await teamsApi.list();
        setTeams(result);
        if (result.length > 0 && !selectedTeam) {
          setSelectedTeam(result[0].id);
        }
      } catch (err) {
        console.error('Failed to load teams:', err);
      }
    };

    loadTeams();
  }, [user]);

  // Load settings when team changes
  const loadSettings = useCallback(async () => {
    if (!selectedTeam) return;

    try {
      setLoading(true);
      const settings = await settingsApi.get(selectedTeam);

      if (settings.slack) {
        setSlackConfig(settings.slack);
      }
      if (settings.email) {
        setEmailConfig({
          ...settings.email,
          smtpPassword: settings.email.smtpPassword || '',
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveSlack = async () => {
    if (!selectedTeam) return;

    setSavingSlack(true);
    try {
      await settingsApi.saveSlack(selectedTeam, slackConfig);
      setSlackTestStatus('idle');
      setSlackTestError(null);
    } catch (err) {
      console.error('Failed to save Slack config:', err);
    } finally {
      setSavingSlack(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!selectedTeam) return;

    setSavingEmail(true);
    try {
      await settingsApi.saveEmail(selectedTeam, emailConfig);
      setEmailTestStatus('idle');
      setEmailTestError(null);
    } catch (err) {
      console.error('Failed to save Email config:', err);
    } finally {
      setSavingEmail(false);
    }
  };

  const handleTestSlack = async () => {
    if (!selectedTeam) return;

    setSlackTestStatus('loading');
    setSlackTestError(null);

    try {
      const result = await settingsApi.testSlack(selectedTeam, slackConfig);
      if (result.success) {
        setSlackTestStatus('success');
        setTimeout(() => setSlackTestStatus('idle'), 3000);
      } else {
        setSlackTestStatus('error');
        setSlackTestError(result.error || 'Test failed');
      }
    } catch (err) {
      setSlackTestStatus('error');
      setSlackTestError(err instanceof Error ? err.message : 'Test failed');
    }
  };

  const handleTestEmail = async () => {
    if (!selectedTeam) return;

    setEmailTestStatus('loading');
    setEmailTestError(null);

    try {
      const result = await settingsApi.testEmail(selectedTeam, emailConfig, user?.email);
      if (result.success) {
        setEmailTestStatus('success');
        setTimeout(() => setEmailTestStatus('idle'), 3000);
      } else {
        setEmailTestStatus('error');
        setEmailTestError(result.error || 'Test failed');
      }
    } catch (err) {
      setEmailTestStatus('error');
      setEmailTestError(err instanceof Error ? err.message : 'Test failed');
    }
  };

  if (authLoading || !user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure integrations and notification channels
            </p>
          </div>
          {teams.length > 1 && (
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="integrations" className="animate-fade-in">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="integrations" className="gap-2">
              <Bell className="h-4 w-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="mt-6 space-y-6">
            {/* Slack Integration */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#4A154B]">
                    <SlackIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Slack</h3>
                    <p className="text-sm text-muted-foreground">
                      Receive alerts in your Slack workspace
                    </p>
                  </div>
                </div>
                <Badge variant={slackConfig.enabled ? 'default' : 'secondary'}>
                  {slackConfig.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="slackWebhook">Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="slackWebhook"
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={slackConfig.webhookUrl}
                      onChange={(e) =>
                        setSlackConfig({ ...slackConfig, webhookUrl: e.target.value })
                      }
                      className="bg-muted/50 font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigator.clipboard.writeText(slackConfig.webhookUrl)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Create a webhook in your Slack workspace:{' '}
                    <a
                      href="https://api.slack.com/messaging/webhooks"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Learn how <ExternalLink className="inline h-3 w-3" />
                    </a>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slackChannel">Default Channel</Label>
                  <Input
                    id="slackChannel"
                    placeholder="#alerts"
                    value={slackConfig.channel}
                    onChange={(e) =>
                      setSlackConfig({ ...slackConfig, channel: e.target.value })
                    }
                    className="bg-muted/50"
                  />
                </div>

                {/* Test result */}
                {slackTestStatus === 'error' && slackTestError && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-400">{slackTestError}</p>
                  </div>
                )}

                {slackTestStatus === 'success' && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <p className="text-sm text-emerald-400">Test notification sent! Check your Slack channel.</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slackConfig.enabled}
                      onChange={(e) =>
                        setSlackConfig({ ...slackConfig, enabled: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-border bg-muted text-primary focus:ring-primary"
                    />
                    <span className="text-sm">Enable Slack notifications</span>
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestSlack}
                      disabled={!slackConfig.webhookUrl || slackTestStatus === 'loading'}
                    >
                      {slackTestStatus === 'loading' ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : slackTestStatus === 'success' ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4 text-emerald-400" />
                          Sent!
                        </>
                      ) : (
                        'Test'
                      )}
                    </Button>
                    <Button size="sm" onClick={handleSaveSlack} disabled={savingSlack}>
                      {savingSlack ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Email Integration */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Email (SMTP)</h3>
                    <p className="text-sm text-muted-foreground">
                      Send alerts via email using your SMTP server
                    </p>
                  </div>
                </div>
                <Badge variant={emailConfig.enabled ? 'default' : 'secondary'}>
                  {emailConfig.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      placeholder="smtp.gmail.com"
                      value={emailConfig.smtpHost}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, smtpHost: e.target.value })
                      }
                      className="bg-muted/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Select
                      value={String(emailConfig.smtpPort)}
                      onValueChange={(value) =>
                        setEmailConfig({ ...emailConfig, smtpPort: parseInt(value) })
                      }
                    >
                      <SelectTrigger className="bg-muted/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25 (SMTP)</SelectItem>
                        <SelectItem value="465">465 (SSL)</SelectItem>
                        <SelectItem value="587">587 (TLS)</SelectItem>
                        <SelectItem value="2525">2525 (Alternative)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">Username</Label>
                    <Input
                      id="smtpUser"
                      placeholder="your@email.com"
                      value={emailConfig.smtpUser}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, smtpUser: e.target.value })
                      }
                      className="bg-muted/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">Password</Label>
                    <div className="relative">
                      <Input
                        id="smtpPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={emailConfig.smtpPassword}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, smtpPassword: e.target.value })
                        }
                        className="bg-muted/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fromEmail">From Email</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      placeholder="alerts@yourcompany.com"
                      value={emailConfig.fromEmail}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, fromEmail: e.target.value })
                      }
                      className="bg-muted/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fromName">From Name</Label>
                    <Input
                      id="fromName"
                      placeholder="Dex Monitoring"
                      value={emailConfig.fromName}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, fromName: e.target.value })
                      }
                      className="bg-muted/50"
                    />
                  </div>
                </div>

                {/* Test result */}
                {emailTestStatus === 'error' && emailTestError && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-400">{emailTestError}</p>
                  </div>
                )}

                {emailTestStatus === 'success' && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <p className="text-sm text-emerald-400">Test email sent to {user?.email}! Check your inbox.</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailConfig.enabled}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, enabled: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-border bg-muted text-primary focus:ring-primary"
                    />
                    <span className="text-sm">Enable Email notifications</span>
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestEmail}
                      disabled={!emailConfig.smtpHost || emailTestStatus === 'loading'}
                    >
                      {emailTestStatus === 'loading' ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : emailTestStatus === 'success' ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4 text-emerald-400" />
                          Sent!
                        </>
                      ) : (
                        'Send Test'
                      )}
                    </Button>
                    <Button size="sm" onClick={handleSaveEmail} disabled={savingEmail}>
                      {savingEmail ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Webhook (Coming Soon) */}
            <div className="rounded-xl border border-border bg-card/50 overflow-hidden opacity-60">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                    <svg
                      className="h-6 w-6 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold">Custom Webhook</h3>
                    <p className="text-sm text-muted-foreground">
                      Send alerts to any HTTP endpoint
                    </p>
                  </div>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security" className="mt-6 space-y-6">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-6 py-4">
                <h3 className="font-semibold">Account Security</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your account security settings
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Change Password */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Change Password</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input id="currentPassword" type="password" className="bg-muted/50" />
                    </div>
                    <div />
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input id="confirmPassword" type="password" className="bg-muted/50" />
                    </div>
                  </div>
                  <Button size="sm">Update Password</Button>
                </div>

                <div className="border-t border-border pt-6">
                  <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Once you delete your account, there is no going back.
                  </p>
                  <Button variant="destructive" size="sm" className="mt-4">
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
