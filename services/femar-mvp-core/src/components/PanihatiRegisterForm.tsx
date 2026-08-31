'use client';

import React, { useState } from 'react';

type Lang = 'es' | 'en';

type Props = {
  lang: Lang;
  defaultKind?: 'budget' | 'sponsor';
  onDone: (message: string) => void;
  onCancel: () => void;
};

const CATEGORIES = [
  'Logistica',
  'Sonido y luces',
  'Alimentacion FFL',
  'Marketing',
  'Permisos',
  'Fotografia',
  'Transporte',
  'Otros',
];

export default function PanihatiRegisterForm({ lang, defaultKind = 'budget', onDone, onCancel }: Props) {
  const isEs = lang === 'es';
  const [kind, setKind] = useState<'budget' | 'sponsor'>(defaultKind);
  const [tier, setTier] = useState<'Oro' | 'Plata' | 'Voluntario'>('Oro');
  const [concepto, setConcepto] = useState('');
  const [tipo, setTipo] = useState<'Gasto' | 'Ingreso' | 'Donacion' | 'Especie'>('Gasto');
  const [categoria, setCategoria] = useState('Otros');
  const [estado, setEstado] = useState<'Estimado' | 'Cotizado' | 'Pagado' | 'Donado'>('Estimado');
  const [monto, setMonto] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [notas, setNotas] = useState('');
  const [nombre, setNombre] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const amount = monto ? Number(monto.replace(',', '.')) : 0;
      if (kind === 'sponsor') {
        if (!nombre.trim()) throw new Error(isEs ? 'Nombre requerido' : 'Name required');
        const res = await fetch('/api/ecosystem/panihati/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'sponsor',
            lang,
            entry: {
              nombre,
              montoUsd: amount,
              notas: notas ? `${tier} · ${notas}` : tier,
              estado: 'Confirmado',
              tier,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'save_failed');
        onDone(isEs ? `Patrocinador guardado: ${nombre}` : `Sponsor saved: ${nombre}`);
        return;
      }

      if (!concepto.trim()) throw new Error(isEs ? 'Concepto requerido' : 'Concept required');

      const isQuote = estado === 'Cotizado';
      const res = await fetch('/api/ecosystem/panihati/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'budget',
          lang,
          entry: {
            concepto,
            tipo,
            categoria,
            estado,
            montoEstimado: isQuote ? amount : undefined,
            montoReal: !isQuote && amount > 0 ? amount : undefined,
            proveedor,
            notas,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'save_failed');

      if (file) {
        const form = new FormData();
        form.append('file', file);
        form.append('linked_concepto', concepto);
        await fetch('/api/ecosystem/panihati/documents', { method: 'POST', body: form });
      }

      onDone(isEs ? `Registro guardado: ${concepto}` : `Entry saved: ${concepto}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : isEs ? 'Error al guardar' : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 text-left">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setKind('budget')}
          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${kind === 'budget' ? 'border-amber-400/60 bg-amber-500/15 text-amber-200' : 'border-zinc-700 text-zinc-400'}`}
        >
          {isEs ? 'Gasto / ingreso' : 'Expense / income'}
        </button>
        <button
          type="button"
          onClick={() => setKind('sponsor')}
          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${kind === 'sponsor' ? 'border-amber-400/60 bg-amber-500/15 text-amber-200' : 'border-zinc-700 text-zinc-400'}`}
        >
          {isEs ? 'Patrocinador' : 'Sponsor'}
        </button>
      </div>

      {kind === 'budget' ? (
        <>
          <label className="block text-xs text-zinc-400">{isEs ? 'Concepto' : 'Concept'}</label>
          <input
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-white"
            placeholder={isEs ? 'Ej. Sonido y luces' : 'E.g. Sound and lights'}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-zinc-400">{isEs ? 'Tipo' : 'Type'}</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as typeof tipo)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-2 py-2 text-sm text-white"
              >
                <option value="Gasto">{isEs ? 'Gasto' : 'Expense'}</option>
                <option value="Ingreso">{isEs ? 'Ingreso' : 'Income'}</option>
                <option value="Donacion">{isEs ? 'Donación' : 'Donation'}</option>
                <option value="Especie">{isEs ? 'Especie' : 'In-kind'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400">{isEs ? 'Estado' : 'Status'}</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as typeof estado)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-2 py-2 text-sm text-white"
              >
                <option value="Estimado">{isEs ? 'Estimado' : 'Estimated'}</option>
                <option value="Cotizado">{isEs ? 'Cotizado' : 'Quoted'}</option>
                <option value="Pagado">{isEs ? 'Pagado' : 'Paid'}</option>
                <option value="Donado">{isEs ? 'Donado' : 'Donated'}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-zinc-400">{isEs ? 'Categoría' : 'Category'}</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-2 py-2 text-sm text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400">{isEs ? 'Monto USD' : 'Amount USD'}</label>
              <input
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-white"
                placeholder="250"
              />
            </div>
          </div>
          <label className="block text-xs text-zinc-400">{isEs ? 'Proveedor' : 'Vendor'}</label>
          <input
            value={proveedor}
            onChange={(e) => setProveedor(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-white"
          />
          <label className="block text-xs text-zinc-400">{isEs ? 'Cotización / documento (PDF, imagen)' : 'Quote / document (PDF, image)'}</label>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-zinc-300 file:mr-2 file:rounded file:border-0 file:bg-amber-500/20 file:px-2 file:py-1 file:text-amber-200"
          />
        </>
      ) : (
        <>
          <label className="block text-xs text-zinc-400">{isEs ? 'Nombre patrocinador' : 'Sponsor name'}</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-white"
          />
          <label className="block text-xs text-zinc-400">{isEs ? 'Monto USD' : 'Amount USD'}</label>
          <input
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            inputMode="decimal"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-white"
          />
          <label className="block text-xs text-zinc-400">{isEs ? 'Tier' : 'Tier'}</label>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as typeof tier)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-2 py-2 text-sm text-white"
          >
            <option value="Oro">{isEs ? 'Oro' : 'Gold'}</option>
            <option value="Plata">{isEs ? 'Plata' : 'Silver'}</option>
            <option value="Voluntario">{isEs ? 'Voluntario' : 'Volunteer'}</option>
          </select>
        </>
      )}

      <label className="block text-xs text-zinc-400">{isEs ? 'Notas' : 'Notes'}</label>
      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        rows={2}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-white"
      />

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-lg bg-amber-500/90 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-60"
        >
          {busy ? '…' : isEs ? 'Guardar localmente' : 'Save locally'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:text-white"
        >
          {isEs ? 'Cancelar' : 'Cancel'}
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-zinc-500">
        {isEs
          ? 'Los datos se guardan en el servidor ISKCON Desk (local). Notion ya no recibe escrituras.'
          : 'Data is saved on the local ISKCON Desk server. Notion no longer receives writes.'}
      </p>
    </form>
  );
}
