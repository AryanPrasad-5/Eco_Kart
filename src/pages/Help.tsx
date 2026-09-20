import { DashboardLayout } from '../layouts/DashboardLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { Phone, Mail, HelpCircle } from 'lucide-react';

export function Help() {
  return (
    <DashboardLayout role="generator" title="Help & Support">
      <Card className="max-w-xl mx-auto mt-8">
        <CardHeader title="Need assistance?" subtitle="Get in touch with our support team" />
        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center text-center pb-6 border-b border-line">
            <div className="grid h-16 w-16 place-items-center rounded-full border border-line-strong bg-surface-2 text-ink-soft mb-4">
              <HelpCircle size={28} />
            </div>
            <p className="text-sm text-ink-soft max-w-md">
              We're here to help you with pickups, account issues, or general inquiries. Contact us using the details below.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg border border-line bg-surface-2/30">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-accent-soft text-accent">
                <Phone size={18} />
              </div>
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-ink-faint">Call Us (24/7)</p>
                <a href="tel:+918001234567" className="font-display text-lg font-semibold text-ink hover:text-accent transition-colors">
                  +91 800 123 4567
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border border-line bg-surface-2/30">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-accent-soft text-accent">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-ink-faint">Email Us</p>
                <a href="mailto:support@smartsort.in" className="font-display text-base font-semibold text-ink hover:text-accent transition-colors">
                  support@smartsort.in
                </a>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </DashboardLayout>
  );
}
