'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import styles from './judge.module.css';
import type { JudgeRunResult, JudgeState, JudgeTestDefinition, JudgeTraceEvent } from '@/lib/judgeCore';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  result?: JudgeRunResult;
};

type StatusPayload = {
  tests?: JudgeTestDefinition[];
  trace?: JudgeTraceEvent[];
  trace_status?: string;
  truth?: {
    function_gemma?: string;
    mi325x?: string;
  };
};

function badgeClass(status: JudgeState) {
  if (status === 'LIVE') return `${styles.badge} ${styles.live}`;
  if (status === 'RUNNING') return `${styles.badge} ${styles.running}`;
  if (status === 'PARTIAL' || status === 'DEGRADED') return `${styles.badge} ${styles.partial}`;
  if (status === 'FAIL' || status === 'ERROR' || status === 'TIMEOUT') return `${styles.badge} ${styles.fail}`;
  return `${styles.badge} ${styles.ready}`;
}

function shortTime(timestamp?: string) {
  if (!timestamp) return '--:--:--';
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour12: false });
  } catch {
    return '--:--:--';
  }
}

function compact(value?: string | null, max = 42) {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export default function JudgeConsolePage() {
  const [tests, setTests] = useState<JudgeTestDefinition[]>([]);
  const [states, setStates] = useState<Record<number, JudgeState>>({});
  const [trace, setTrace] = useState<JudgeTraceEvent[]>([]);
  const [traceStatus, setTraceStatus] = useState<'LIVE' | 'STALE' | 'DEGRADED'>('STALE');
  const [provider, setProvider] = useState<'auto' | 'local' | 'gemini'>('auto');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'ARIA is ready. Ask about the architecture, request a real model response, or type “run test 1” through “run test 7”. Every execution reports its correlation ID and provenance.',
    },
  ]);
  const [truth, setTruth] = useState<StatusPayload['truth']>({});
  const chatRef = useRef<HTMLDivElement | null>(null);
  const lastGoodTraceRef = useRef<JudgeTraceEvent[]>([]);

  const runningTest = useMemo(
    () => Number(Object.entries(states).find(([, value]) => value === 'RUNNING')?.[0] || 0),
    [states]
  );

  async function refreshStatus(initial = false) {
    try {
      const response = await fetch('/api/judge', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as StatusPayload;
      if (Array.isArray(data.tests)) {
        setTests(data.tests);
        if (initial) {
          setStates(Object.fromEntries(data.tests.map((test) => [test.id, 'READY'])) as Record<number, JudgeState>);
        }
      }
      if (data.truth) setTruth(data.truth);
      const incoming = Array.isArray(data.trace) ? data.trace : [];
      if (incoming.length > 0) {
        const byId = new Map<string, JudgeTraceEvent>();
        [...lastGoodTraceRef.current, ...incoming].forEach((event) => byId.set(event.id, event));
        const merged = [...byId.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).slice(-120);
        lastGoodTraceRef.current = merged;
        setTrace(merged);
        setTraceStatus(data.trace_status === 'DEGRADED' ? 'DEGRADED' : 'LIVE');
      } else if (lastGoodTraceRef.current.length > 0) {
        setTrace(lastGoodTraceRef.current);
        setTraceStatus('STALE');
      } else {
        setTrace([]);
        setTraceStatus(data.trace_status === 'DEGRADED' ? 'DEGRADED' : 'STALE');
      }
    } catch {
      if (lastGoodTraceRef.current.length > 0) setTrace(lastGoodTraceRef.current);
      setTraceStatus('STALE');
    }
  }

  useEffect(() => {
    refreshStatus(true);
    const timer = window.setInterval(() => refreshStatus(false), 3000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const container = chatRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  async function runTest(testId: number) {
    if (busy || runningTest) return;
    setBusy(true);
    setStates((current) => ({ ...current, [testId]: 'RUNNING' }));
    try {
      const response = await fetch('/api/judge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'run-test', test_id: testId }),
      });
      const result = (await response.json()) as JudgeRunResult;
      const finalState = result.status || (response.ok ? 'LIVE' : 'ERROR');
      setStates((current) => ({ ...current, [testId]: finalState }));
      setMessages((current) => [
        ...current,
        {
          id: `test-${testId}-${Date.now()}`,
          role: 'assistant',
          text: `${result.title}: ${result.detail}`,
          result,
        },
      ]);
      await refreshStatus(false);
    } catch (error) {
      setStates((current) => ({ ...current, [testId]: 'ERROR' }));
      setMessages((current) => [
        ...current,
        {
          id: `test-error-${Date.now()}`,
          role: 'assistant',
          text: error instanceof Error ? error.message : 'Judge test failed.',
          result: {
            ok: false,
            test_id: testId,
            correlation_id: 'unavailable',
            status: 'ERROR',
            title: `Test ${testId}`,
            detail: 'Client request failed before a verified terminal response.',
          },
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function submitAria(event: FormEvent) {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || busy) return;
    setInput('');
    setBusy(true);
    setMessages((current) => [...current, { id: `u-${Date.now()}`, role: 'user', text: prompt }]);
    try {
      const response = await fetch('/api/judge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'aria', prompt, provider }),
      });
      const result = (await response.json()) as JudgeRunResult;
      if (result.test_id) {
        setStates((current) => ({ ...current, [result.test_id!]: result.status || 'ERROR' }));
      }
      setMessages((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: result.detail || 'No model content returned.',
          result,
        },
      ]);
      await refreshStatus(false);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `a-error-${Date.now()}`,
          role: 'assistant',
          text: error instanceof Error ? error.message : 'ARIA request failed.',
          result: {
            ok: false,
            correlation_id: 'unavailable',
            status: 'ERROR',
            title: 'ARIA',
            detail: 'The request did not produce verified backend evidence.',
          },
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}><span className={styles.liveDot} /> InnerOS · Judge Workspace</div>
            <h1 className={styles.title}>ARIA Enterprise Agent Fleet</h1>
            <p className={styles.subtitle}>
              Run seven independent evidence paths. Nothing is marked successful before execution, and model responses expose the actual provider, runtime, node and correlation ID.
            </p>
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.metaPill}>Local-first orchestration</span>
            <span className={styles.metaPill}>Gemini + Google Cloud</span>
            <span className={styles.metaPill}>A2A · MCP · durable evidence</span>
          </div>
        </header>

        <div className={styles.truthRow}>
          <span className={styles.truthPill}><strong>FunctionGemma:</strong> historical proof · live state evaluated on demand</span>
          <span className={styles.truthPill}><strong>MI325X:</strong> historical proof · intentionally destroyed after burst</span>
          <span className={styles.truthPill}><strong>Trace:</strong> {traceStatus}</span>
        </div>

        <section className={styles.testBar} aria-label="Judge tests">
          {tests.map((test) => {
            const state = states[test.id] || 'READY';
            return (
              <button
                key={test.id}
                className={styles.testButton}
                type="button"
                disabled={busy || Boolean(runningTest)}
                onClick={() => runTest(test.id)}
                title={test.subtitle}
              >
                <div className={styles.testTop}>
                  <span className={styles.testNumber}>TEST {test.id}</span>
                  <span className={badgeClass(state)}>{state}</span>
                </div>
                <div className={styles.testTitle}>{test.title}</div>
                <div className={styles.testSubtitle}>{test.subtitle}</div>
              </button>
            );
          })}
        </section>

        <section className={styles.workspace}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>ARIA</h2>
                <div className={styles.panelCaption}>Real model responses · natural “run test N” commands · no canned success</div>
              </div>
              <select className={styles.select} value={provider} onChange={(event) => setProvider(event.target.value as 'auto' | 'local' | 'gemini')}>
                <option value="auto">Auto route</option>
                <option value="local">AMD local vLLM</option>
                <option value="gemini">Gemini 3.5+</option>
              </select>
            </div>

            <div ref={chatRef} className={styles.chatBody}>
              {messages.map((message) => (
                <div key={message.id} className={`${styles.message} ${message.role === 'user' ? styles.user : styles.assistant}`}>
                  <div>{message.text}</div>
                  {message.result && (
                    <div className={styles.provenance}>
                      <span>{message.result.status}</span>
                      <span>corr:{compact(message.result.correlation_id, 30)}</span>
                      {message.result.provider && <span>provider:{compact(message.result.provider, 22)}</span>}
                      {message.result.model && <span>model:{compact(message.result.model, 28)}</span>}
                      {message.result.runtime && <span>runtime:{compact(message.result.runtime, 24)}</span>}
                      {message.result.node && <span>node:{compact(message.result.node, 18)}</span>}
                      {typeof message.result.latency_ms === 'number' && <span>{message.result.latency_ms}ms</span>}
                      {message.result.evidence_ref && <span>evidence:{compact(message.result.evidence_ref, 34)}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form className={styles.composer} onSubmit={submitAria}>
              <input
                className={styles.input}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask ARIA, or type: run test 1"
                disabled={busy}
              />
              <button className={styles.sendButton} type="submit" disabled={busy || !input.trim()}>{busy ? 'Running…' : 'Send'}</button>
            </form>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Global Live Trace</h2>
                <div className={styles.panelCaption}>Persisted backend events · last-good snapshot preserved on transient fetch gaps</div>
              </div>
              <span className={traceStatus === 'LIVE' ? badgeClass('LIVE') : traceStatus === 'DEGRADED' ? badgeClass('DEGRADED') : styles.stale}>
                {traceStatus}
              </span>
            </div>

            <div className={styles.traceBody}>
              {trace.length === 0 ? (
                <div className={styles.empty}>Execute a test or send an ARIA request. Real persisted events will appear here.</div>
              ) : (
                trace.slice().reverse().map((event) => (
                  <div className={styles.traceEvent} key={event.id}>
                    <div className={styles.traceHead}>
                      <span className={styles.traceTime}>{shortTime(event.timestamp)}</span>
                      <span className={styles.traceType}>{event.event_type} · {compact(event.correlation_id, 28)}</span>
                      <span className={badgeClass(event.status)}>{event.status}</span>
                    </div>
                    <div className={styles.traceDetail}>
                      {event.source} → {event.target} · {event.protocol}
                      {event.model ? ` · ${event.model}` : ''}
                      {event.node ? ` · ${event.node}` : ''}
                      {typeof event.latency_ms === 'number' ? ` · ${event.latency_ms}ms` : ''}
                      {event.detail ? ` · ${compact(event.detail, 160)}` : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <footer className={styles.footer}>
          <span>Canonical demo: inneros.creatorcore.ai/app/judge</span>
          <span>{truth?.function_gemma ? 'Truth state loaded from Judge API' : 'Evidence-driven UI · no pre-baked PASS states'}</span>
        </footer>
      </div>
    </main>
  );
}
