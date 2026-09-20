import { DashboardLayout } from '../layouts/DashboardLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LogIn, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export function Settings() {
  const { user, signOut } = useAuth();

  return (
    <DashboardLayout role="generator" title="Settings">
      <Card className="max-w-xl mx-auto mt-8">
        <CardHeader title="Profile" subtitle="Manage your account" />
        <div className="p-6 flex flex-col items-center text-center space-y-6">
          <div className="grid h-20 w-20 place-items-center rounded-full border border-accent-line bg-accent-soft text-accent">
            <UserRound size={32} />
          </div>
          
          {user ? (
            <div className="space-y-4 w-full">
              <div>
                <p className="text-sm text-ink-faint uppercase tracking-wider font-mono mb-1">Signed in as</p>
                <p className="font-display text-lg font-semibold text-ink">{user.email}</p>
              </div>
              
              <div className="pt-6 border-t border-line">
                <Button 
                  variant="secondary" 
                  onClick={() => signOut()} 
                  className="w-full justify-center"
                  icon={<LogOut size={16} />}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 w-full">
              <p className="text-sm text-ink-soft">
                You are currently browsing as a guest. Sign in to save your preferences and manage your account.
              </p>
              <div className="pt-6 border-t border-line">
                <Button 
                  variant="primary" 
                  onClick={() => window.location.hash = '#/signin'} 
                  className="w-full justify-center glow-accent"
                  icon={<LogIn size={16} />}
                >
                  Sign In
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </DashboardLayout>
  );
}
