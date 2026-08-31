'use client';

import { Download, ExternalLink, FileText } from 'lucide-react';
import type { JudgeStepProof } from '@/lib/judgeStepProof';

function statusTone(status: JudgeStepProof['status']) {
  if (status === 'PASS') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
  if (status === 'PARTIAL') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  return 'border-red-500/30 bg-red-500/10 text-red-100';
}

export default function JudgeProofCard({ proof }: { proof: JudgeStepProof }) {
  return (
    <div className={`mt-3 rounded-xl border p-3 ${statusTone(proof.status)}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">Proof produced</p>
          <p className="text-sm font-semibold text-white">{proof.headline}</p>
        </div>
        <span className="rounded border border-current/30 px-2 py-0.5 text-[10px] font-bold">{proof.status}</span>
      </div>
      <p className="mt-2 text-[11px] leading-5 opacity-95">{proof.summary}</p>
      {proof.whatHappened ? (
        <div className="mt-3 rounded-lg border border-white/10 bg-black/15 p-2">
          <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">What happened</p>
          <p className="mt-1 text-[11px] leading-5">{proof.whatHappened}</p>
        </div>
      ) : null}
      {proof.whereToLook ? (
        <p className="mt-2 text-[10px] text-zinc-300/90">
          <span className="font-bold uppercase tracking-wide text-zinc-400">Where to look · </span>
          {proof.whereToLook}
        </p>
      ) : null}
      {proof.excerpt ? (
        <blockquote className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2 text-[11px] italic leading-5">
          {proof.excerpt}
        </blockquote>
      ) : null}
      <ul className="mt-2 space-y-1 text-[10px] leading-4 opacity-90">
        {proof.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
        {proof.provider ? <span className="rounded bg-black/20 px-2 py-1">Provider: {proof.provider}</span> : null}
        {proof.model ? <span className="rounded bg-black/20 px-2 py-1">Model: {proof.model}</span> : null}
        {proof.runtime ? <span className="rounded bg-black/20 px-2 py-1">Runtime: {proof.runtime}</span> : null}
        {proof.node ? <span className="rounded bg-black/20 px-2 py-1">Node: {proof.node}</span> : null}
        {proof.latencyMs != null ? <span className="rounded bg-black/20 px-2 py-1">{proof.latencyMs} ms</span> : null}
        {proof.dryRun ? <span className="rounded bg-amber-500/20 px-2 py-1 font-bold text-amber-100">DRY-RUN</span> : null}
        {proof.eventCount != null ? <span className="rounded bg-black/20 px-2 py-1">{proof.eventCount} trace events</span> : null}
      </div>
      {proof.pdfUrl ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={proof.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/25"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open PDF
          </a>
          <a
            href={proof.pdfUrl}
            download={proof.pdfFilename || 'judge-emergency-plan.pdf'}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-600 bg-zinc-900/80 px-3 py-1.5 text-[11px] font-semibold text-zinc-100 hover:bg-zinc-800"
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </a>
          <span className="inline-flex items-center gap-1 self-center text-[10px] text-zinc-400">
            <FileText className="h-3 w-3" />
            application/pdf
          </span>
        </div>
      ) : null}
    </div>
  );
}
