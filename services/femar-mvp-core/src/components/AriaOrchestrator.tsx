'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Download, ExternalLink, History, Mic, MicOff, MoreVertical, Paperclip, Plus, Send, Trash2, Volume2 } from 'lucide-react';
import {
  clearLocalAriaSessions,
  loadLocalAriaSessions,
  saveLocalAriaSession,
  sessionTitleFromMessages,
} from '@/lib/ariaChatStorage';
import { innerosCopy, type InnerOSLang } from '@/lib/innerosCopy';
import { isSimpleGreeting, naturalGreetingText, newJudgeGreetingCorrelationId } from '@/lib/judgeAriaGreeting';
import {
  JUDGE_ARIA_STEP_COMMANDS,
  judgeAriaOpeningMessage,
  judgeProvenanceLabel,
} from '@/lib/judgeAriaIntro';

type Artifact = { name: string; mime: string; url: string };

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: Iterable<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type WindowWithSpeech = Window & {
  SpeechRecognition?: new () => SpeechRec;
  webkitSpeechRecognition?: new () => SpeechRec;
};

type Msg = {
  id: string;
  role: 'user' | 'aria';
  text: string;
  navigate?: { url: string; module_id: string };
  artifacts?: Artifact[];
  actionStatus?: string;
  provenance?: string;
  correlationId?: string;
};

type SessionSummary = {
  id: string;
  title: string;
  updatedAt: string;
  messages: Msg[];
};

type JudgeAriaEvent = {
  correlationId?: string;
  action?: string;
  ok?: boolean;
};

type AriaOrchestratorProps = {
  lang: InnerOSLang;
  mode?: 'guest' | 'authenticated';
  panel?: boolean;
  moduleId?: string;
  userId?: string;
  onJudgeEvent?: (event: JudgeAriaEvent) => void;
};

function welcomeMessage(lang: InnerOSLang, moduleId?: string): string {
  const copy = innerosCopy[lang].aria;
  if (moduleId === 'iskcon-desk') {
    return lang === 'es'
      ? 'Soy ARIA en ISKCON Desk. Pide: patrocinadores, plan de emergencia, carta, dossier, WhatsApp o Food for Life.'
      : 'I am ARIA on ISKCON Desk. Ask for: sponsors, emergency plan, letter, dossier, WhatsApp, or Food for Life.';
  }
  if (moduleId === 'judge') {
    return judgeAriaOpeningMessage(lang);
  }
  return copy.welcome;
}

export default function AriaOrchestrator({
  lang,
  mode = 'authenticated',
  panel = false,
  moduleId = 'portal',
  userId,
  onJudgeEvent,
}: AriaOrchestratorProps) {
  const copy = innerosCopy[lang].aria;
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [geminiMode, setGeminiMode] = useState<'gemini' | 'local' | 'checking'>('checking');
  const [voiceSource, setVoiceSource] = useState<'idle' | 'kokoro' | 'browser'>('idle');
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRec | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (mode !== 'authenticated') {
      setGeminiMode('local');
      return;
    }
    fetch('/api/ecosystem/aria/status')
      .then((r) => r.json())
      .then((d) => setGeminiMode(d.mode === 'gemini' ? 'gemini' : 'local'))
      .catch(() => setGeminiMode('local'));
  }, [mode]);

  const startNewChat = useCallback(() => {
    setSessionId(null);
    setMessages([{ id: '0', role: 'aria', text: welcomeMessage(lang, moduleId) }]);
    setInput('');
    setShowHistory(false);
  }, [lang, moduleId]);

  const persistSession = useCallback(
    (nextMessages: Msg[], activeSessionId: string | null) => {
      if (nextMessages.length < 2) return;

      const localId = activeSessionId || `local-${moduleId}-${Date.now()}`;
      const localSession = {
        id: localId,
        title: sessionTitleFromMessages(nextMessages, copy.label),
        updatedAt: new Date().toISOString(),
        messages: nextMessages.map(({ id, role, text, actionStatus }) => ({ id, role, text, actionStatus })),
      };
      saveLocalAriaSession(moduleId, localSession, userId);
      if (!sessionId) setSessionId(localId);
      setSessions((prev) => {
        const rest = prev.filter((s) => s.id !== localId);
        return [{ ...localSession, messages: nextMessages }, ...rest].slice(0, 20);
      });

      if (mode !== 'authenticated' || !userId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          const res = await fetch('/api/ecosystem/aria/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              moduleId,
              sessionId: activeSessionId || undefined,
              messages: localSession.messages,
            }),
          });
          const data = await res.json();
          if (data.session?.id) {
            setSessionId(data.session.id);
            setSessions((prev) => {
              const rest = prev.filter((s) => s.id !== data.session.id && s.id !== localId);
              return [
                {
                  id: data.session.id,
                  title: data.session.title,
                  updatedAt: data.session.updatedAt,
                  messages: nextMessages,
                },
                ...rest,
              ].slice(0, 20);
            });
          }
        } catch {
          // offline — localStorage already saved
        }
      }, 600);
    },
    [mode, moduleId, userId, sessionId, copy.label]
  );

  useEffect(() => {
    const local = loadLocalAriaSessions(moduleId, userId);
    if (local.length) {
      setSessions(local);
      if (local[0]?.messages?.length) {
        setSessionId(local[0].id);
        setMessages(local[0].messages);
        return;
      }
    }
    startNewChat();
  }, [lang, moduleId, userId, startNewChat]);

  useEffect(() => {
    if (mode !== 'authenticated' || !userId) return;
    fetch(`/api/ecosystem/aria/sessions?moduleId=${encodeURIComponent(moduleId)}`)
      .then((r) => r.json())
      .then((d) => {
        const list: SessionSummary[] = (d.sessions || []).map(
          (s: { id: string; title: string; updatedAt: string; messages: Msg[] }) => ({
            id: s.id,
            title: s.title,
            updatedAt: s.updatedAt,
            messages: s.messages || [],
          })
        );
        if (list.length) {
          setSessions((prev) => {
            const merged = [...list];
            for (const item of prev) {
              if (!merged.some((m) => m.id === item.id)) merged.push(item);
            }
            return merged.slice(0, 20);
          });
        }
      })
      .catch(() => {});
  }, [mode, userId, moduleId]);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  useEffect(() => {
    persistSession(messages, sessionId);
  }, [messages, sessionId, persistSession]);

  const speakWithBrowser = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.slice(0, 500));
    utter.lang = lang === 'es' ? 'es-ES' : 'en-US';
    window.speechSynthesis.speak(utter);
  };

  const speak = async (text: string, force = false) => {
    if (!force && !voiceEnabled) return;
    const snippet = text.slice(0, 500);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    try {
      const res = await fetch('/api/ecosystem/aria/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: snippet, lang }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
        setVoiceSource('kokoro');
        return;
      }
    } catch {
      // fallback below
    }
    speakWithBrowser(snippet);
    setVoiceSource('browser');
  };

  const clearHistory = () => {
    clearLocalAriaSessions(moduleId, userId);
    setSessions([]);
    setShowTools(false);
    setShowHistory(false);
    setSessionId(null);
    setInput('');
    setMessages([
      { id: '0', role: 'aria', text: welcomeMessage(lang, moduleId) },
      { id: Date.now().toString(), role: 'aria', text: copy.clearHistoryDone },
    ]);
  };

  const toggleListen = () => {
    const win = typeof window !== 'undefined' ? (window as WindowWithSpeech) : undefined;
    const SpeechRecognitionCtor = win?.SpeechRecognition || win?.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setMessages((m) => [...m, { id: Date.now().toString(), role: 'aria', text: copy.micUnsupported }]);
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const rec = new SpeechRecognitionCtor();
    rec.lang = lang === 'es' ? 'es-ES' : 'en-US';
    rec.interimResults = true;
    rec.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join('');
      setInput(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const send = async (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    if (!overrideText) setInput('');
    if (moduleId === 'judge' && isSimpleGreeting(text)) {
        const userMsg: Msg = {
          id: Date.now().toString(),
          role: 'user',
          text: attachmentName ? `${text}\n[${attachmentName}]` : text,
        };
        const correlationId = newJudgeGreetingCorrelationId();
        const reply = judgeAriaOpeningMessage(lang);
        setMessages((m) => [
          ...m,
          userMsg,
          {
            id: `${Date.now()}-greeting`,
            role: 'aria',
            text: reply,
            actionStatus: 'LIVE',
            provenance: 'LOCAL COMMAND',
          },
        ]);
        onJudgeEvent?.({ correlationId, action: 'greeting', ok: true });
        setAttachmentName(null);
        setPendingFile(null);
        return;
      }
    const userMsg: Msg = {
      id: Date.now().toString(),
      role: 'user',
      text: attachmentName ? `${text}\n[${attachmentName}]` : text,
    };
    const nextMessages = [...messages, userMsg];
    const runningMsgId = `${Date.now()}-running`;
    const runningText =
      moduleId === 'judge'
        ? lang === 'es'
          ? 'Enviando a Judge MCP... esperando respuesta real.'
          : 'Sending to Judge MCP... waiting for a live response.'
        : lang === 'es'
          ? 'Procesando...'
          : 'Working...';
    setMessages([...nextMessages, { id: runningMsgId, role: 'aria', text: runningText, actionStatus: 'RUNNING' }]);
    setLoading(true);
    try {
      const endpoint =
        mode === 'guest'
          ? '/api/ecosystem/aria/guest'
          : moduleId === 'judge'
            ? '/api/ecosystem/aria/judge'
            : '/api/ecosystem/aria';
      const history = messages
        .filter((m) => m.id !== '0')
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }));

      const attachmentPayload = pendingFile
        ? await (async () => {
            const fd = new FormData();
            fd.append('file', pendingFile);
            fd.append('name', pendingFile.name);
            const up = await fetch('/api/ecosystem/aria/upload', { method: 'POST', body: fd });
            if (!up.ok) return null;
            const data = await up.json();
            return data.attachment || null;
          })()
        : null;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          history,
          lang,
          moduleContext: { moduleId },
          attachment: attachmentPayload,
        }),
      });
      const data = await res.json();
      const reply =
        data.text ||
        (res.ok ? copy.basicReply : mode === 'guest' ? copy.guestReply : copy.basicReply);

      const ariaMsg: Msg = {
        id: (Date.now() + 1).toString(),
        role: 'aria',
        text: reply,
        navigate: data.navigate,
        artifacts: data.artifacts,
        actionStatus: data.action?.status,
        provenance:
          data.provenance ||
          (moduleId === 'judge'
            ? judgeProvenanceLabel(typeof data.action === 'object' ? data.action?.id : data.action)
            : undefined),
        correlationId: data.correlation_id,
      };
      setMessages((m) => [...m.filter((msg) => msg.id !== runningMsgId), ariaMsg]);
      speak(reply);

      if (moduleId === 'judge' && onJudgeEvent) {
        onJudgeEvent({
          correlationId: data.correlation_id,
          action: data.action?.id,
          ok: data.ok,
        });
      }

      if (data.navigate?.url && mode === 'authenticated') {
        setTimeout(() => {
          window.location.href = data.navigate.url;
        }, 1200);
      }
    } catch (err) {
      const text =
        moduleId === 'judge'
          ? lang === 'es'
            ? `Judge ARIA no pudo completar la llamada. Estado: ERROR. ${String(err).slice(0, 160)}`
            : `Judge ARIA could not complete the live call. Status: ERROR. ${String(err).slice(0, 160)}`
          : copy.basicReply;
      setMessages((m) => [
        ...m.filter((msg) => msg.id !== runningMsgId),
        { id: Date.now().toString(), role: 'aria', text, actionStatus: 'ERROR' },
      ]);
    } finally {
      setLoading(false);
      setAttachmentName(null);
      setPendingFile(null);
    }
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/csv'];
    if (!allowed.includes(file.type)) {
      setMessages((m) => [
        ...m,
        {
          id: Date.now().toString(),
          role: 'aria',
          text:
            lang === 'es'
              ? 'Tipo de archivo no permitido (png/jpg/webp/pdf/csv).'
              : 'File type not allowed (png/jpg/webp/pdf/csv).',
        },
      ]);
      return;
    }
    setAttachmentName(file.name);
    setPendingFile(file);
    e.target.value = '';
  };

  const shellClass = panel
    ? `flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950/40 ${
        moduleId === 'judge' ? 'h-full min-h-0' : 'h-full'
      }`
    : 'flex w-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xl';

  const toggleTools = () => {
    setShowTools((v) => !v);
    if (!showTools) setShowHistory(false);
  };

  const toggleHistory = () => {
    setShowHistory((v) => !v);
    if (!showHistory) setShowTools(false);
  };

  return (
    <div className={shellClass}>
      <div className="relative z-20 shrink-0 border-b border-zinc-800 bg-gradient-to-r from-blue-950/40 to-purple-950/20 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleTools}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white shadow-lg shadow-blue-500/20 ring-2 transition ${
                showTools ? 'ring-amber-400/80' : 'ring-transparent hover:ring-blue-400/50'
              }`}
              aria-label={copy.toolsMenu}
              title={copy.toolsMenu}
            >
              A
            </button>
            <div className="min-w-0">
              <button
                type="button"
                onClick={toggleTools}
                className="text-left text-sm font-semibold text-white hover:text-blue-200"
              >
                {copy.label}
              </button>
              <p className="truncate text-[10px] text-zinc-500">
                {moduleId}
                {mode === 'authenticated' ? (
                  <span
                    className={`ml-1.5 inline-flex items-center gap-1 ${
                      geminiMode === 'gemini' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        geminiMode === 'gemini' ? 'bg-emerald-400' : geminiMode === 'checking' ? 'bg-zinc-500 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    {geminiMode === 'gemini' ? 'Gemini' : geminiMode === 'checking' ? '…' : lang === 'es' ? 'Local' : 'Local'}
                  </span>
                ) : null}
                {voiceSource !== 'idle' ? (
                  <span className="ml-1.5 text-zinc-400">
                    · {voiceSource === 'kokoro' ? copy.ttsKokoro : copy.ttsBrowser}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={toggleHistory}
              className={`rounded-lg px-2 py-1.5 text-[11px] font-medium ${
                showHistory ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
              aria-label={copy.history}
            >
              <History className="mx-auto h-4 w-4" />
              <span className="mt-0.5 block">{copy.history}</span>
            </button>
            <button
              type="button"
              onClick={toggleTools}
              className={`rounded-lg px-2 py-1.5 text-[11px] font-medium ${
                showTools ? 'bg-amber-500/20 text-amber-200' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
              aria-label={copy.toolsMenu}
            >
              <MoreVertical className="mx-auto h-4 w-4" />
              <span className="mt-0.5 block">{copy.toolsMenu}</span>
            </button>
          </div>
        </div>

        {showTools ? (
          <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-lg border border-zinc-700/80 bg-zinc-950/90 p-2">
            <button
              type="button"
              onClick={() => {
                startNewChat();
                setShowTools(false);
              }}
              className="flex items-center gap-2 rounded-md border border-zinc-700/60 px-2 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" /> {copy.newChat}
            </button>
            <button
              type="button"
              onClick={() => {
                toggleHistory();
              }}
              className="flex items-center gap-2 rounded-md border border-zinc-700/60 px-2 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800"
            >
              <History className="h-3.5 w-3.5 shrink-0" /> {copy.history}
            </button>
            <button
              type="button"
              onClick={() => setVoiceEnabled((v) => !v)}
              className={`flex items-center gap-2 rounded-md border px-2 py-2 text-left text-xs ${
                voiceEnabled
                  ? 'border-blue-500/40 bg-blue-600/15 text-blue-200'
                  : 'border-zinc-700/60 text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Volume2 className="h-3.5 w-3.5 shrink-0" /> {voiceEnabled ? copy.voiceOn : copy.voiceOff}
            </button>
            <button
              type="button"
              onClick={clearHistory}
              className="flex items-center gap-2 rounded-md border border-red-500/30 px-2 py-2 text-left text-xs text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" /> {copy.clearHistory}
            </button>
          </div>
        ) : null}
        {showHistory ? (
          <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/80 p-2">
            {sessions.length === 0 ? (
              <p className="text-center text-[11px] text-zinc-500">{copy.noHistory}</p>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSessionId(s.id);
                    setMessages(s.messages.length ? s.messages : [{ id: '0', role: 'aria', text: welcomeMessage(lang, moduleId) }]);
                    setShowHistory(false);
                  }}
                  className={`block w-full rounded-md px-2 py-1.5 text-left text-[11px] ${
                    sessionId === s.id ? 'bg-blue-600/20 text-blue-300' : 'text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <span className="block truncate font-medium">{s.title}</span>
                  <span className="text-[10px] text-zinc-600">{new Date(s.updatedAt).toLocaleString()}</span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      <div ref={messagesRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`group relative max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-blue-600/80 text-white'
                  : 'border border-zinc-700/50 bg-zinc-800/80 text-zinc-200'
              }`}
            >
              {m.role === 'aria' && <Bot className="mr-1 inline h-3 w-3 text-blue-400" />}
              {m.text}
              {m.role === 'aria' ? (
                <button
                  type="button"
                  onClick={() => speak(m.text, true)}
                  className="ml-2 inline-flex align-middle text-zinc-500 opacity-70 transition hover:text-blue-300 group-hover:opacity-100"
                  aria-label={copy.speak}
                  title={copy.speak}
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
              {m.actionStatus ? (
                <span
                  className={`mt-1 block text-[10px] uppercase tracking-wide ${
                    m.actionStatus === 'LIVE'
                      ? 'text-emerald-400'
                      : m.actionStatus === 'RUNNING'
                        ? 'text-blue-300'
                        : m.actionStatus === 'ERROR' || m.actionStatus === 'NOT_READY'
                          ? 'text-red-400'
                          : 'text-amber-400'
                  }`}
                >
                  {m.actionStatus}
                </span>
              ) : null}
              {m.navigate ? (
                <a href={m.navigate.url} className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-400">
                  {copy.openModule} <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
              {m.artifacts?.map((a) => (
                <a
                  key={a.url}
                  href={a.url}
                  download={a.name}
                  className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-400"
                >
                  <Download className="h-3 w-3" /> {a.name}
                </a>
              ))}
              {m.role === 'aria' && m.provenance ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-zinc-700/60 pt-2 text-[9px] text-zinc-500">
                  <span className="rounded bg-zinc-900/80 px-1.5 py-0.5 font-bold uppercase tracking-wide text-zinc-300">
                    {m.provenance}
                  </span>
                  {m.correlationId ? <span className="font-mono">{m.correlationId.slice(0, 42)}</span> : null}
                </div>
              ) : null}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {moduleId === 'judge' ? (
        <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/80 px-2 py-2">
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
            {lang === 'es' ? '7 pruebas guiadas' : '7 guided proofs'}
          </p>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {JUDGE_ARIA_STEP_COMMANDS.map((item) => (
              <button
                key={item.step}
                type="button"
                disabled={loading}
                onClick={() => {
                  void send(undefined, item.command);
                }}
                className="shrink-0 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium text-violet-100 hover:bg-violet-500/20 disabled:opacity-40"
              >
                {item.step}. {item.label}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-zinc-600">
            {lang === 'es'
              ? 'Pregunta lo que quieras para verificar respuesta en vivo.'
              : 'Ask anything to verify a live response.'}
          </p>
        </div>
      ) : null}

      <form onSubmit={send} className="flex shrink-0 gap-1.5 border-t border-zinc-800 bg-zinc-950/90 p-2">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".png,.jpg,.jpeg,.webp,.pdf,.csv"
          onChange={onFilePick}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-zinc-700 px-2 py-2 text-zinc-400 hover:text-white"
          aria-label={copy.tools}
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={toggleListen}
          title={
            lang === 'es'
              ? 'STT navegador (fallback — no es Lemonade local)'
              : 'Browser STT (fallback — not local Lemonade)'
          }
          className={`rounded-lg border px-2 py-2 ${
            listening ? 'border-red-500/50 bg-red-500/10 text-red-300' : 'border-zinc-700 text-zinc-400 hover:text-white'
          }`}
          aria-label={copy.listen}
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={attachmentName ? `${copy.placeholder} (${attachmentName})` : copy.placeholder}
          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-blue-600 px-3 py-2 transition-colors hover:bg-blue-500 disabled:opacity-40"
          aria-label={innerosCopy[lang].common.send}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
