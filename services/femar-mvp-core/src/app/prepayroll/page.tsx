"use client";

import React, { useState } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { useEmployees } from "@/hooks/useEmployees";

export default function PrePayrollPage() {
  const [filter, setFilter] = useState('ALL');
  const { activeCompanyId } = useAuth();
  const { employees: companyEmployees, loadingEmployees } = useEmployees(activeCompanyId);
  const [realtimeLogs, setRealtimeLogs] = React.useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoadingLogs(true);
    fetch('/api/logs/realtime', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setRealtimeLogs(data.logs || []);
      })
      .catch(() => {
        if (!cancelled) setRealtimeLogs([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingLogs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCompanyId]);

  const employeeMap = new Map(companyEmployees.map(emp => [emp.id, emp]));

  const novelties = realtimeLogs
    .filter(log => employeeMap.has(log.user_id))
    .map((log, i) => {
    const emp = employeeMap.get(log.user_id);
    const state = String(log.state ?? '');
    const type = state === '0' ? 'CHECK_IN' : state === '1' ? 'CHECK_OUT' : 'ATTENDANCE_EVENT';

    return {
      id: log.id || `log-${log.user_id}-${i}`,
      user_id: log.user_id,
      name: emp?.name || log.user_id,
      source: log.source || 'ZKTECO',
      timestamp: log.timestamp,
      type,
      minutes: 0
    };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '2rem', backgroundColor: '#0A0A0A', color: '#FAFAFA', minHeight: '100vh' }}>
      <header style={{ borderBottom: '1px solid #333', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 600, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Prenómina y Novedades
            </h1>
            <p style={{ color: '#888', marginTop: '0.5rem' }}>Consolidado de asistencia, horas extra y llegadas tardías ({novelties.length} registros)</p>
          </div>
          <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid #333', backgroundColor: '#111', textAlign: 'center' }}>
            <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Empleados Procesados</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{loadingEmployees ? '...' : companyEmployees.length}</div>
          </div>
        </div>
        
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => setFilter('ALL')}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: filter === 'ALL' ? '#3b82f6' : '#222', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Todas
          </button>
          <button 
            onClick={() => setFilter('ZKTECO')}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: filter === 'ZKTECO' ? '#3b82f6' : '#222', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Locales (ZKTeco)
          </button>
          <button 
            onClick={() => setFilter('MOBILE')}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: filter === 'MOBILE' ? '#3b82f6' : '#222', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Remotas (Mobile)
          </button>
        </div>
      </header>

      <div style={{ overflowX: 'auto', backgroundColor: '#111', borderRadius: '12px', border: '1px solid #222', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#1A1A1A', borderBottom: '1px solid #333' }}>
              <th style={{ padding: '1rem', color: '#AAA', fontWeight: 500 }}>Empleado</th>
              <th style={{ padding: '1rem', color: '#AAA', fontWeight: 500 }}>Origen</th>
              <th style={{ padding: '1rem', color: '#AAA', fontWeight: 500 }}>Fecha / Hora</th>
              <th style={{ padding: '1rem', color: '#AAA', fontWeight: 500 }}>Tipo de Novedad</th>
              <th style={{ padding: '1rem', color: '#AAA', fontWeight: 500 }}>Minutos</th>
            </tr>
          </thead>
          <tbody>
            {loadingLogs ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Cargando novedades reales...</td>
              </tr>
            ) : novelties.filter(n => filter === 'ALL' || n.source === filter).length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No hay novedades registradas.</td>
              </tr>
            ) : (
              novelties.filter(n => filter === 'ALL' || n.source === filter).map((item: any) => {
                let badgeColor = '#333';
                let textColor = '#FFF';
                
                if (item.type === 'LATE_ARRIVAL') { badgeColor = '#7f1d1d'; textColor = '#fca5a5'; }
                if (item.type === 'OVERTIME') { badgeColor = '#14532d'; textColor = '#86efac'; }
                if (item.type === 'EARLY_DEPARTURE') { badgeColor = '#7c2d12'; textColor = '#fdba74'; }
                if (item.type === 'ON_TIME') { badgeColor = '#1e3a8a'; textColor = '#93c5fd'; }

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{item.name}</span>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>{item.user_id}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: '#222', border: '1px solid #333' }}>
                        {item.source}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#CCC' }}>
                      {new Date(item.timestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 500, backgroundColor: badgeColor, color: textColor }}>
                        {item.type}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600, color: item.minutes > 0 ? '#E2E8F0' : '#555' }}>
                      {item.minutes > 0 ? `${item.minutes} min` : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
