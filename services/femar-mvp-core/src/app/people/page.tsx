"use client";

import React, { useState } from "react";
import GlassWidget from "@/components/GlassWidget";
import { Users, User, Phone, Mail, MapPin, Plus, Edit2, X, Save, ShieldCheck, Search, Loader2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { mockEmployees } from "@/lib/mockData";

export default function PeoplePage() {
  const { t } = useI18n();
  const { activeCompanyId } = useAuth();

  const mockFallback = mockEmployees.filter(e => e.companyId === activeCompanyId);
  const [employees, setEmployees] = useState<any[]>(mockFallback);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const fetchEmps = async () => {
      setLoadingEmployees(true);
      const fallback = mockEmployees.filter(e => e.companyId === activeCompanyId);
      try {
        const url = activeCompanyId
          ? `/api/employees?companyId=${encodeURIComponent(activeCompanyId)}`
          : '/api/employees';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data.employees) && data.employees.length > 0) {
            setEmployees(data.employees);
            setLoadingEmployees(false);
            return;
          }
        }
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
      if (!cancelled) {
        setEmployees(fallback);
        setLoadingEmployees(false);
      }
    };
    fetchEmps();
    return () => { cancelled = true; };
  }, [activeCompanyId]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);

  // Form State
  const [formId, setFormId] = useState("");
  const [formFirstName, setFormFirstName] = useState("");
  const [formSecondName, setFormSecondName] = useState("");
  const [formFirstLastName, setFormFirstLastName] = useState("");
  const [formSecondLastName, setFormSecondLastName] = useState("");
  const [formDob, setFormDob] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formDepartment, setFormDepartment] = useState("Ventas");
  const [newDepartment, setNewDepartment] = useState("");
  const [isAddingDepartment, setIsAddingDepartment] = useState(false);
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formStatus, setFormStatus] = useState("Activo");

  // Departments List
  const [departments, setDepartments] = useState([
    "Directorio Corporativo", "Ventas", "Marketing", "Recursos Humanos", "IT", "Operaciones"
  ]);

  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState("");

  const handleOpenCreate = () => {
    setEditingEmployee(null);
    setFormId("");
    setFormFirstName("");
    setFormSecondName("");
    setFormFirstLastName("");
    setFormSecondLastName("");
    setFormDob("");
    setFormRole("");
    setFormDepartment("Ventas");
    setIsAddingDepartment(false);
    setFormPhone("");
    setFormEmail("");
    setFormAddress("");
    setFormStatus("Activo");
    setValidationError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: any) => {
    setEditingEmployee(emp);
    setFormId(emp.id);
    setFormFirstName(emp.firstName || "");
    setFormSecondName(emp.secondName || "");
    setFormFirstLastName(emp.firstLastName || "");
    setFormSecondLastName(emp.secondLastName || "");
    setFormDob(emp.dob || "");
    setFormRole(emp.role);
    setFormDepartment(emp.department);
    if (!departments.includes(emp.department)) {
      setDepartments([...departments, emp.department]);
    }
    setFormPhone(emp.phone);
    setFormEmail(emp.email);
    setFormAddress(emp.address);
    setFormStatus(emp.status);
    setValidationError("");
    setIsModalOpen(true);
  };

  const handleValidateId = async () => {
    if (!formId.trim()) {
      setValidationError("Ingrese una cédula/RUC para validar");
      return;
    }
    setIsValidating(true);
    setValidationError("");

    try {
      const res = await fetch("/api/validate-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idNumber: formId })
      });
      const data = await res.json();

      if (!res.ok) {
        setValidationError(data.error || "Identificación no encontrada en el SRI. Ingrese manualmente.");
      } else {
        // Parse names from razonSocial (Assume AP1 AP2 NOM1 NOM2 format roughly)
        const parts = data.data.razonSocial.trim().split(" ");
        if (parts.length >= 4) {
          setFormFirstLastName(parts[0]);
          setFormSecondLastName(parts[1]);
          setFormFirstName(parts[2]);
          setFormSecondName(parts.slice(3).join(" "));
        } else if (parts.length === 3) {
          setFormFirstLastName(parts[0]);
          setFormSecondLastName(parts[1]);
          setFormFirstName(parts[2]);
        } else {
          // Fallback if parsing is ambiguous
          setFormFirstName(data.data.razonSocial);
        }
      }
    } catch (err) {
      setValidationError("Error de conexión al validar");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = () => {
    setValidationError("");
    if (!formId.trim()) return setValidationError("La cédula es requerida");
    if (!formFirstName.trim() || !formFirstLastName.trim()) return setValidationError("Nombres y apellidos son requeridos");
    
    // Phone Validation (Only numbers)
    const phoneRegex = /^[0-9]+$/;
    if (formPhone && !phoneRegex.test(formPhone)) return setValidationError("El teléfono solo debe contener números");

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formEmail && !emailRegex.test(formEmail)) return setValidationError("Formato de correo inválido");

    const activeDept = isAddingDepartment && newDepartment.trim() ? newDepartment.trim() : formDepartment;
    
    if (isAddingDepartment && newDepartment.trim() && !departments.includes(newDepartment.trim())) {
      setDepartments([...departments, newDepartment.trim()]);
    }

    const fullName = `${formFirstName} ${formSecondName} ${formFirstLastName} ${formSecondLastName}`.replace(/\s+/g, ' ').trim();

    const empData = {
      id: formId,
      firstName: formFirstName,
      secondName: formSecondName,
      firstLastName: formFirstLastName,
      secondLastName: formSecondLastName,
      name: fullName,
      dob: formDob,
      role: formRole || "Nuevo Empleado",
      department: activeDept,
      phone: formPhone,
      email: formEmail,
      address: formAddress,
      status: formStatus,
      baseSalary: editingEmployee ? editingEmployee.baseSalary : 500,
      photo: editingEmployee ? editingEmployee.photo : `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`
    };

    fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(empData)
    }).then(res => res.json()).then(data => {
      if (!data.error) {
        if (editingEmployee) {
          setEmployees(employees.map(emp => 
            emp.id === editingEmployee.id ? { ...emp, ...empData } : emp
          ));
        } else {
          setEmployees([empData, ...employees]);
        }
        setIsModalOpen(false);
      } else {
        setValidationError(data.error);
      }
    }).catch(err => {
      setValidationError("Error de conexión");
    });
  };

  const departmentsMap = employees.reduce((acc, emp) => {
    acc[emp.department] = (acc[emp.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <main className="p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            {t("people")}
          </h1>
          <p className="text-sm md:text-base text-zinc-400">
            Gestión integral de personal y perfiles profesionales
          </p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors font-medium text-sm shadow-[0_0_15px_rgba(37,99,235,0.3)] w-fit"
        >
          <Plus className="w-4 h-4" /> Agregar Personal
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {Object.entries(departmentsMap).map(([dept, count]) => (
          <GlassWidget key={dept} title={`${dept} (${count} empleados)`} icon={Users}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-4">
              {employees.filter(e => e.department === dept).map((employee) => (
                <div key={employee.id} className="relative overflow-hidden group border border-zinc-700/50 bg-zinc-800/30 rounded-2xl p-5 hover:border-blue-500/50 hover:bg-zinc-800/50 transition-all flex flex-col h-full">
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button 
                      onClick={() => handleOpenEdit(employee)}
                      className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Editar Empleado"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border h-fit ${
                      employee.status === "Activo" ? "bg-green-500/10 text-green-400 border-green-500/30" : 
                      employee.status === "Liquidado" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                      employee.status === "Vacaciones" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                      "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                    }`}>
                      {employee.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4 mt-2">
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-zinc-700 group-hover:border-blue-500 transition-colors">
                        <img src={employee.photo} alt={employee.firstName} className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-zinc-200">
                        {employee.name}
                      </h3>
                      <p className="text-sm text-blue-400">{employee.role}</p>
                      <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                        <ShieldCheck className="w-3 h-3" /> {employee.department}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mt-auto pt-4 border-t border-zinc-700/50">
                    <div className="flex items-center gap-3 text-sm text-zinc-400">
                      <User className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                      <span className="font-mono text-zinc-300">C.I. {employee.id}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-400">
                      <Phone className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                      <span>{employee.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-400">
                      <Mail className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                      <span className="truncate" title={employee.email}>{employee.email}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassWidget>
        ))}
      </div>

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-zinc-900 pt-2 pb-4 border-b border-zinc-800 z-10">
              <h2 className="text-xl font-bold text-white">
                {editingEmployee ? "Editar Empleado" : "Agregar Nuevo Personal"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {validationError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {validationError}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-sm text-zinc-400 mb-1">Cédula de Identidad / RUC *</label>
                  <input 
                    type="text"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    disabled={!!editingEmployee}
                    placeholder="Ej. 1790000000"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                {!editingEmployee && (
                  <button 
                    onClick={handleValidateId}
                    disabled={isValidating || !formId}
                    className="px-4 py-2 bg-zinc-800 border border-zinc-700 hover:border-blue-500 hover:text-blue-400 text-zinc-300 rounded-lg transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
                  >
                    {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Validar Cédula
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Primer Nombre *</label>
                  <input 
                    type="text"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Segundo Nombre</label>
                  <input 
                    type="text"
                    value={formSecondName}
                    onChange={(e) => setFormSecondName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Primer Apellido *</label>
                  <input 
                    type="text"
                    value={formFirstLastName}
                    onChange={(e) => setFormFirstLastName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Segundo Apellido</label>
                  <input 
                    type="text"
                    value={formSecondLastName}
                    onChange={(e) => setFormSecondLastName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Fecha de Nacimiento</label>
                  <input 
                    type="date"
                    value={formDob}
                    onChange={(e) => setFormDob(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Cargo / Rol</label>
                  <input 
                    type="text"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Grupo / Departamento</label>
                {!isAddingDepartment ? (
                  <div className="flex gap-2">
                    <select 
                      value={formDepartment}
                      onChange={(e) => setFormDepartment(e.target.value)}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <button 
                      onClick={() => setIsAddingDepartment(true)}
                      className="px-3 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300"
                    >
                      + Nuevo
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={newDepartment}
                      onChange={(e) => setNewDepartment(e.target.value)}
                      placeholder="Nombre del nuevo departamento"
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                    <button 
                      onClick={() => setIsAddingDepartment(false)}
                      className="px-3 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Teléfono (Solo números)</label>
                  <input 
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Correo Electrónico</label>
                  <input 
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Estado</label>
                <select 
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option>Activo</option>
                  <option>Inactivo</option>
                  <option>Vacaciones</option>
                  <option>Permiso Médico</option>
                  <option>Permiso por Maternidad</option>
                  <option>Liquidado</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex gap-3 justify-end sticky bottom-0 bg-zinc-900 pt-4 border-t border-zinc-800">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors font-medium text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={!formId.trim() || !formFirstName.trim() || !formFirstLastName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Guardar Perfil
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
