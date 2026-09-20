import { useState } from 'react';
import { ArrowLeft, ArrowRight, SearchX } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table';
import { Timeline } from '../components/ui/Timeline';
import { EmptyState } from '../components/ui/Skeleton';
import { TRANSACTIONS } from '../data/listings';
import { formatDate, formatInrPlain, formatQuantity } from '../lib/format';
import { TRANSACTION_STAGES } from '../types';
import { SettlementStack } from '../components/tr/SettlementStack';

export function Transactions() {
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  const selectedTx = TRANSACTIONS.find(t => t.id === selectedTxId) || TRANSACTIONS[0];

  return (
    <DashboardLayout role="generator" title="Transactions">
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
        <Card>
          <CardHeader title="All transactions" subtitle="every trade, with live settlement stage" />
          {TRANSACTIONS.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={<SearchX size={18} />} title="No transactions yet" body="Your first accepted offer creates one." />
            </div>
          ) : (
            <Table caption="Transactions" className="table-fixed w-full min-w-0">
              <THead>
                <TR>
                  <TH className="w-[15%]">Tx ID</TH>
                  <TH className="w-[25%]">Counterparty</TH>
                  <TH className="w-[15%]">Value</TH>
                  <TH className="w-[20%]">Stage</TH>
                  <TH className="w-[15%]">Opened</TH>
                  <TH className="w-[10%]" />
                </TR>
              </THead>
              <TBody>
                {TRANSACTIONS.map((t) => (
                  <TR 
                    key={t.id} 
                    className={`cursor-pointer transition-colors ${selectedTxId === t.id ? 'bg-surface-2/60' : 'hover:bg-surface-2/30'}`}
                    onClick={() => setSelectedTxId(t.id)}
                  >
                    <TD><span className="font-mono text-xs text-accent">{t.id}</span></TD>
                    <TD className="max-w-[160px] truncate">{t.counterparty}</TD>
                    <TD className="tabular font-medium">{formatInrPlain(t.valueInr)}</TD>
                    <TD>
                      <StatusBadge status={t.stage >= 5 ? 'accepted' : t.stage >= 3 ? 'reserved' : 'pending'} />
                    </TD>
                    <TD className="tabular text-ink-soft">{formatDate(t.openedAt)}</TD>
                    <TD className="text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.hash = `#/transaction/${t.id}`;
                        }}
                        aria-label={`Open transaction ${t.id}`}
                        className="rounded p-1 text-ink-faint transition-colors hover:text-accent"
                      >
                        <ArrowRight size={15} />
                      </button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        {selectedTx && (
          <div className="sticky top-24">
            <Card className="min-h-[500px] flex flex-col">
              <div className="flex items-center justify-between border-b border-line p-5">
                <div>
                  <h3 className="font-display font-semibold text-ink flex items-center gap-2">
                    {selectedTx.id} 
                    <StatusBadge status={selectedTx.stage >= 5 ? 'accepted' : selectedTx.stage >= 3 ? 'reserved' : 'pending'} />
                  </h3>
                </div>
              </div>
              <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
                <div className="flex-1 p-6 relative min-h-[300px]">
                  <SettlementStack currentStage={selectedTx.stage} key={selectedTx.id} />
                </div>
                <div className="w-full md:w-48 border-t md:border-t-0 md:border-l border-line p-5 bg-surface-2/30 flex flex-col justify-center gap-3">
                  {TRANSACTION_STAGES.map((stage, i) => {
                    const isCompleted = i < selectedTx.stage;
                    const isCurrent = i === selectedTx.stage;
                    return (
                      <div key={i} className="flex items-center gap-3 text-[11px] uppercase tracking-wider font-mono">
                        <div className={`w-2 h-2 rounded-full ${
                          isCompleted ? 'bg-accent' : isCurrent ? 'bg-accent animate-pulse' : 'border border-line-strong'
                        }`} />
                        <span className={isCurrent ? 'text-ink font-bold' : isCompleted ? 'text-ink-soft' : 'text-ink-faint'}>
                          {stage}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export function TransactionDetail({ id }: { id: string }) {
  const tx = TRANSACTIONS.find((t) => t.id === id);

  if (!tx) {
    return (
      <DashboardLayout role="generator" title="Transaction">
        <EmptyState
          icon={<SearchX size={18} />}
          title={`Transaction ${id} doesn't exist`}
          body="It may have been archived. The transactions register lists everything current."
          action={
            <Button variant="secondary" size="sm" onClick={() => (window.location.hash = '#/transactions')}>
              Back to transactions
            </Button>
          }
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      role="generator"
      title={`Transaction ${tx.id}`}
      actions={
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={() => (window.location.hash = '#/transactions')}>
          All transactions
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <Timeline stage={tx.stage} id={tx.id} />
          </Card>

          <Card>
            <CardHeader title="Trade summary" />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-3">
              {[
                ['Counterparty', tx.counterparty],
                ['Material', tx.material],
                ['Quantity', formatQuantity(tx.quantityTonnes)],
                ['Value', formatInrPlain(tx.valueInr)],
                ['Opened', formatDate(tx.openedAt)],
                ['Direction', tx.direction],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">{label}</dt>
                  <dd className="tabular mt-1 text-sm font-medium capitalize text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Stage log" subtitle="what happened, and when" />
            <ol className="space-y-4 px-5 py-5">
              {TRANSACTION_STAGES.slice(0, tx.stage + 1)
                .map((label, i) => ({ label, i }))
                .reverse()
                .map(({ label, i }) => (
                  <li key={label} className="flex gap-3 text-sm">
                    <span className="w-20 shrink-0 tabular text-xs text-ink-faint">{formatDate(tx.openedAt)}</span>
                    <span className={`font-medium ${i === tx.stage ? 'text-accent' : 'text-ink'}`}>{label}</span>
                  </li>
                ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">Settlement</p>
            <p className="tabular mt-1 font-display text-2xl font-semibold text-ink">{formatInrPlain(tx.valueInr)}</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              {tx.stage >= 5
                ? 'Paid out to your registered account.'
                : 'Held in escrow. Released T+2 after the weight slip is confirmed by both parties.'}
            </p>
            <div className="mt-4 rounded-md border border-line bg-surface-2/60 p-3 text-xs leading-relaxed text-ink-soft">
              Discrepancy policy: if the collected weight differs by more than 5%, the payout recalculates automatically at the agreed ₹/kg.
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
