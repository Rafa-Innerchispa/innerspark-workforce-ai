"use client";

import React, { useEffect, useMemo, useState } from "react";
import GlassWidget from "@/components/GlassWidget";
import { Edit2, Loader2, Mail, Phone, Plus, Save, Search, User, Users, X } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

type Employee = {
  id: string;
  name: string;
  firstName?: string;
  secondName?: string;
  firstLastName?: string;
  secondLastName?: string;
  role?: string;
  department?: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: string;
  dob?: string;
};

type EmployeeForm = Omit<Employee, "name">;

const emptyForm: EmployeeForm = {
  id: "",
  firstName: "",
  secondName: "",
  firstLastName: "",
  secondLastName: "",
  role: "",
  department: "Operaciones",
  phone: "",
  email: "",
  address: "",
  status: "Activo",
  dob: "",
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

export default function PeoplePage() {
  const { t } = useI18n();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [error, setError] = useState("");

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/employees", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || "No se pudo cargar el personal");
      setEmployees(Array.isArray(data.employees) ? data.employees : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error cargando personal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEmployees();
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return employees;
    return employees.filter((employee) =>
      [employee.id, employee.name, employee.department, employee.role, employee.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [employees, search]);

  const departments = useMemo(() => {
    const grouped = new Map<string, Employee[]>();
    for (const employee of filtered) {
      const key = employee.department || "Sin departamento";
      grouped.set(key, [...(grouped.get(key) || []), employee]);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setForm({
      id: employee.id,
      firstName: employee.firstName || "",
      secondName: employee.secondName || "",
      firstLastName: employee.firstLastName || "",
      secondLastName: employee.secondLastName || "",
      role: employee.role || "",
      department: employee.department || "Operaciones",
      phone: employee.phone || "",
      email: employee.email || "",
      address: employee.address || "",
      status: employee.status || "Activo",
      dob: employee.dob || "",
    });
    setError("");
    setModalOpen(true);
  };

  const save = async () => {
    setError("");
    if (!form.id.trim()) return setError("La identificación es obligatoria");
    if (!form.firstName?.trim() || !form.firstLastName?.trim()) return setError("Nombre y primer apellido son obligatorios");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError("El correo no tiene un formato válido");
    if (form.phone && !/^[0-9+()\-\s]+$/.test(form.phone)) return setError("El teléfono contiene caracteres no válidos");

    const name = [form.firstName, form.secondName, form.firstLastName, form.secondLastName]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    setSaving(true);
    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || "No se pudo guardar el empleado");
      setModalOpen(false);
      await loadEmployees();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error guardando empleado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-blue-400 font-semibold">Workforce • People</div>
          <h1 className="text-3xl md:text-4xl font-bold mt-2">{t("people")}</h1>
          <p className="text-zinc-400 mt-2">Directorio real del tenant. Altas y cambios se sincronizan con el backend y los dispositivos autorizados.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold">
          <Plus className="w-4 h-4" /> Agregar personal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"><div className="text-zinc-500 text-sm">Personas</div><div className="text-3xl font-bold mt-1">{employees.length}</div></div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"><div className="text-zinc-500 text-sm">Departamentos</div><div className="text-3xl font-bold mt-1">{new Set(employees.map((employee) => employee.department).filter(Boolean)).size}</div></div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"><div className="text-zinc-500 text-sm">Activos</div><div className="text-3xl font-bold mt-1">{employees.filter((employee) => (employee.status || "Activo").toLowerCase() === "activo").length}</div></div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, cédula, departamento, cargo o correo..." className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-500" />
      </div>

      {error && !modalOpen && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 p-4">{error}</div>}

      {loading ? (
        <div className="py-16 flex justify-center text-zinc-500"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : departments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 p-12 text-center text-zinc-500">No hay empleados para mostrar. Agrega la primera persona o cambia el filtro.</div>
      ) : departments.map(([department, members]) => (
        <GlassWidget key={department} title={`${department} (${members.length})`} icon={Users}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {members.map((employee) => (
              <div key={employee.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col gap-4 hover:border-blue-500/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center font-bold text-blue-300 shrink-0">{initials(employee.name)}</div>
                    <div className="min-w-0"><div className="font-semibold text-zinc-100 truncate">{employee.name}</div><div className="text-xs text-zinc-500 mt-1">C.I. {employee.id}</div></div>
                  </div>
                  <button onClick={() => openEdit(employee)} className="p-2 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10"><Edit2 className="w-4 h-4" /></button>
                </div>
                <div className="text-sm text-zinc-400 space-y-2">
                  <div className="flex gap-2"><User className="w-4 h-4 mt-0.5" /><span>{employee.role || "Sin cargo definido"}</span></div>
                  {employee.phone && <div className="flex gap-2"><Phone className="w-4 h-4 mt-0.5" /><span>{employee.phone}</span></div>}
                  {employee.email && <div className="flex gap-2 min-w-0"><Mail className="w-4 h-4 mt-0.5 shrink-0" /><span className="truncate">{employee.email}</span></div>}
                </div>
                <div><span className="inline-flex px-2.5 py-1 rounded-full text-xs border border-zinc-700 bg-zinc-800 text-zinc-300">{employee.status || "Activo"}</span></div>
              </div>
            ))}
          </div>
        </GlassWidget>
      ))}

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6"><div><div className="text-xs uppercase tracking-[0.2em] text-blue-400">People</div><h2 className="text-xl font-bold mt-1">{editingId ? "Editar persona" : "Nueva persona"}</h2></div><button onClick={() => setModalOpen(false)} className="p-2 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Cédula / ID"><input disabled={Boolean(editingId)} value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} className="field" /></Field>
              <Field label="Fecha de nacimiento"><input type="date" value={form.dob || ""} onChange={(event) => setForm({ ...form, dob: event.target.value })} className="field" /></Field>
              <Field label="Primer nombre"><input value={form.firstName || ""} onChange={(event) => setForm({ ...form, firstName: event.target.value })} className="field" /></Field>
              <Field label="Segundo nombre"><input value={form.secondName || ""} onChange={(event) => setForm({ ...form, secondName: event.target.value })} className="field" /></Field>
              <Field label="Primer apellido"><input value={form.firstLastName || ""} onChange={(event) => setForm({ ...form, firstLastName: event.target.value })} className="field" /></Field>
              <Field label="Segundo apellido"><input value={form.secondLastName || ""} onChange={(event) => setForm({ ...form, secondLastName: event.target.value })} className="field" /></Field>
              <Field label="Cargo"><input value={form.role || ""} onChange={(event) => setForm({ ...form, role: event.target.value })} className="field" /></Field>
              <Field label="Departamento"><input value={form.department || ""} onChange={(event) => setForm({ ...form, department: event.target.value })} className="field" /></Field>
              <Field label="Teléfono"><input value={form.phone || ""} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="field" /></Field>
              <Field label="Correo"><input type="email" value={form.email || ""} onChange={(event) => setForm({ ...form, email: event.target.value })} className="field" /></Field>
              <Field label="Estado"><select value={form.status || "Activo"} onChange={(event) => setForm({ ...form, status: event.target.value })} className="field"><option>Activo</option><option>Vacaciones</option><option>Licencia</option><option>Inactivo</option><option>Liquidado</option></select></Field>
              <Field label="Dirección"><input value={form.address || ""} onChange={(event) => setForm({ ...form, address: event.target.value })} className="field" /></Field>
            </div>
            {error && <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 p-3 text-sm">{error}</div>}
            <div className="mt-6 flex justify-end gap-3"><button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-200">Cancelar</button><button disabled={saving} onClick={() => void save()} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold flex items-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar</button></div>
          </div>
        </div>
      )}

      <style jsx>{`.field{width:100%;background:#18181b;border:1px solid #3f3f46;border-radius:.75rem;padding:.7rem .8rem;color:#fff;outline:none}.field:focus{border-color:#3b82f6}.field:disabled{opacity:.55;cursor:not-allowed}`}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-sm text-zinc-400 mb-1.5">{label}</span>{children}</label>;
}
