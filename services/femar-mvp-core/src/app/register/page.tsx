'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, AlertCircle, Languages } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    cedula: '',
    name: '',
    password: '',
    companyId: 'innerspark_labs'
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const router = useRouter();

  const validateName = (name: string) => {
    // Only letters and spaces. At least two words (name and surname).
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!regex.test(name)) return false;
    const words = name.trim().split(/\s+/);
    return words.length >= 2;
  };

  const validateCedula = (cedula: string) => {
    // Alphanumeric, at least 5 chars (covers passports, IDs, DEVPOST-JUDGE, etc.)
    const regex = /^[a-zA-Z0-9\-]+$/;
    return regex.test(cedula) && cedula.length >= 5;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    if (!formData.cedula || !formData.name || !formData.password) {
      setStatus('error');
      setMessage(lang === 'en' ? 'All fields are required' : 'Todos los campos son obligatorios');
      return;
    }

    if (!validateCedula(formData.cedula)) {
      setStatus('error');
      setMessage(lang === 'en' ? 'ID must contain only letters, numbers, or dashes (min 5 characters)' : 'La cédula/ID solo debe contener letras, números o guiones (min 5 caracteres)');
      return;
    }

    if (!validateName(formData.name)) {
      setStatus('error');
      setMessage(lang === 'en' ? 'Please enter your full name (at least Name and Surname, no numbers)' : 'Por favor ingresa tu nombre completo (al menos un Nombre y Apellido, sin números)');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok) {
        setStatus('success');
        setMessage(lang === 'en' ? 'Registration successful. Your account is pending admin approval.' : 'Registro exitoso. Tu cuenta debe ser aprobada por el administrador.');
        setTimeout(() => router.push('/login'), 4000);
      } else {
        setStatus('error');
        setMessage(data.message || (lang === 'en' ? 'Registration error' : 'Error al registrarse'));
      }
    } catch (err) {
      setStatus('error');
      setMessage(lang === 'en' ? 'Connection error' : 'Error de conexión');
    }
  };

  const toggleLang = () => setLang(prev => prev === 'en' ? 'es' : 'en');

  const t = {
    en: {
      title: 'Create Account',
      subtitle: 'Request access to Workforce AI',
      success: 'Request Sent!',
      redirect: 'You will be redirected to login in a few seconds...',
      idLabel: 'National ID / Document',
      idPlace: 'e.g. EMP-XP-001 or Passport',
      nameLabel: 'Full Name',
      namePlace: 'John Doe',
      passLabel: 'Password',
      passPlace: 'Create a password',
      companyLabel: 'Company',
      btnReg: 'Register',
      btnLoad: 'Processing...',
      backLogin: 'Back to Login'
    },
    es: {
      title: 'Crear Cuenta',
      subtitle: 'Solicita acceso al sistema Workforce AI',
      success: '¡Solicitud Enviada!',
      redirect: 'Serás redirigido al login en unos segundos...',
      idLabel: 'Cédula / Documento',
      idPlace: 'Ej. EMP-XP-001 o Pasaporte',
      nameLabel: 'Nombre Completo',
      namePlace: 'Juan Pérez',
      passLabel: 'Contraseña',
      passPlace: 'Crea una contraseña',
      companyLabel: 'Empresa',
      btnReg: 'Registrarse',
      btnLoad: 'Procesando...',
      backLogin: 'Volver al Login'
    }
  }[lang];

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 relative overflow-hidden bg-zinc-950">
      <button 
        onClick={toggleLang}
        className="absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700 hover:bg-zinc-700/50 text-zinc-300 text-sm font-medium transition-colors"
      >
        <Languages className="w-4 h-4" />
        {lang === 'en' ? 'Español' : 'English'}
      </button>

      {/* Background Effects */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>
      
      <div className="w-full max-w-md glass-card rounded-3xl p-8 shadow-2xl border border-zinc-800/50 backdrop-blur-xl animate-in fade-in zoom-in duration-500 relative overflow-hidden">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 mb-4">
            <UserPlus className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
            {t.title}
          </h1>
          <p className="text-zinc-400 text-sm">
            {t.subtitle}
          </p>
        </div>

        {status === 'success' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">{t.success}</h3>
            <p className="text-zinc-400 text-sm">{t.redirect}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">{t.idLabel}</label>
              <input
                type="text"
                value={formData.cedula}
                onChange={e => setFormData({...formData, cedula: e.target.value})}
                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t.idPlace}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">{t.nameLabel}</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t.namePlace}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">{t.passLabel}</label>
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t.passPlace}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">{t.companyLabel}</label>
              <select
                value={formData.companyId}
                onChange={e => setFormData({...formData, companyId: e.target.value})}
                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="innerspark_labs">InnerSpark Labs (XPRIZE Sandbox)</option>
                <option value="pcdoctor">PC Doctor AI</option>
                <option value="iapro">IA Pro</option>
                <option value="femar">FEMAR S.A.</option>
              </select>
            </div>

            {status === 'error' && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg transition-colors mt-4 disabled:opacity-50"
            >
              {status === 'loading' ? t.btnLoad : t.btnReg}
            </button>
            
            <div className="text-center mt-4">
              <a href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
                {t.backLogin}
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
