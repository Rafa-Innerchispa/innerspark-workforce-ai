'use client';

import { ChevronRight, Play } from 'lucide-react';
import JudgeProofCard from '@/components/JudgeProofCard';
import type { JudgeDemoStep } from '@/lib/judgeDemoSteps';
import type { JudgeStepProof } from '@/lib/judgeStepProof';
import { readinessBadgeClass, type RouteReadiness } from '@/lib/judgeVisualAudit';

export type JudgeStepRunState = {
  id: string;
  ok?: boolean;
  proof?: JudgeStepProof;
  running?: boolean;
  correlationId?: string;
};

function StepStatusPill({ state }: { state: 'READY' | 'RUNNING' | RouteReadiness }) {
  const classes =
    state === 'READY'
      ? 'border-zinc-700 bg-zinc-800/70 text-zinc-300'
      : state === 'RUNNING'
        ? 'border-blue-500/40 bg-blue-500/15 text-blue-200'
        : readinessBadgeClass(state);
  return <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold ${classes}`}>{state}</span>;
}

function runLabel(idx: number, running: boolean) {
  if (running) return 'Running...';
  if (idx === 2) return 'Verify evidence';
  if (idx === 3) return 'Generate PDF';
  return `Run test ${idx + 1}`;
}

export default function JudgeStepCard({
  step,
  idx,
  state,
  disabled,
  defaultOpen,
  onRun,
}: {
  step: JudgeDemoStep;
  idx: number;
  state?: JudgeStepRunState;
  disabled: boolean;
  defaultOpen?: boolean;
  onRun: () => void;
}) {
  const isActive = state?.running;
  const title = step.labelEn.replace(/^\d+\s·\s*/, '');

  return (
    <article
      className={`flex min-h-[340px] flex-col rounded-xl border bg-zinc-900/60 shadow-sm shadow-black/20 ${
        isActive ? 'border-blue-500/50 ring-1 ring-blue-500/30' : 'border-zinc-800'
      }`}
    >
      <div className="flex flex-wrap items-start gap-3 border-b border-zinc-800 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-sm font-bold text-violet-200">
          {idx + 1}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-zinc-400">{step.purpose}</p>
        </div>
        {state?.running ? (
          <StepStatusPill state="RUNNING" />
        ) : state?.ok === true ? (
          <StepStatusPill state="LIVE" />
        ) : state?.ok === false ? (
          <StepStatusPill state="NOT_READY" />
        ) : (
          <StepStatusPill state="READY" />
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={onRun}
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-[11px] text-violet-100 hover:bg-violet-500/20 disabled:opacity-40"
        >
          <Play className="h-3 w-3" />
          {runLabel(idx, Boolean(isActive))}
        </button>
      </div>

      <div className="flex flex-1 flex-col px-4 py-3 text-xs text-zinc-400">
        <div className="grid gap-2 text-[10px] sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2">
            <span className="font-semibold uppercase tracking-wide text-zinc-500">Protocol</span>
            <p className="mt-1 font-mono text-zinc-300">{step.protocol}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2">
            <span className="font-semibold uppercase tracking-wide text-zinc-500">Where to look</span>
            <p className="mt-1 text-zinc-300">Proof block below + Global Live Trace →</p>
          </div>
        </div>

        {state?.proof ? (
          <JudgeProofCard proof={state.proof} />
        ) : (
          <div className="mt-3 flex flex-1 flex-col justify-center rounded-xl border border-dashed border-zinc-700/80 bg-zinc-950/40 p-4 text-center">
            <ChevronRight className="mx-auto mb-2 h-4 w-4 text-zinc-600" />
            <p className="text-[11px] text-zinc-500">
              Run this test to see <span className="text-zinc-300">what happened</span>,{' '}
              <span className="text-zinc-300">proof produced</span>, and matching trace events on the right.
            </p>
          </div>
        )}

        {state?.correlationId ? (
          <p className="mt-auto break-all pt-3 font-mono text-[9px] text-violet-300/90">
            correlation_id: {state.correlationId}
          </p>
        ) : null}
      </div>
    </article>
  );
}
