import { db } from '@/lib/firebase';
import React from 'react';

// Force dynamic rendering since we are fetching from Firestore on every request
export const dynamic = 'force-dynamic';

async function fetchNovelties() {
  const snapshot = await db.collection('novelties').orderBy('created_at', 'desc').limit(50).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export default async function PrePayrollPage() {
  const novelties = await fetchNovelties();

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '2rem', backgroundColor: '#0A0A0A', color: '#FAFAFA', minHeight: '100vh' }}>
      <header style={{ borderBottom: '1px solid #333', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 600, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Prenómina y Novedades
        </h1>
        <p style={{ color: '#888', marginTop: '0.5rem' }}>Consolidado de asistencia, horas extra y llegadas tardías (Últimas 50 marcaciones)</p>
      </header>

      <div style={{ overflowX: 'auto', backgroundColor: '#111', borderRadius: '12px', border: '1px solid #222', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#1A1A1A', borderBottom: '1px solid #333' }}>
              <th style={{ padding: '1rem', color: '#AAA', fontWeight: 500 }}>ID Empleado</th>
              <th style={{ padding: '1rem', color: '#AAA', fontWeight: 500 }}>Origen</th>
              <th style={{ padding: '1rem', color: '#AAA', fontWeight: 500 }}>Fecha / Hora</th>
              <th style={{ padding: '1rem', color: '#AAA', fontWeight: 500 }}>Tipo de Novedad</th>
              <th style={{ padding: '1rem', color: '#AAA', fontWeight: 500 }}>Minutos</th>
            </tr>
          </thead>
          <tbody>
            {novelties.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No hay novedades registradas.</td>
              </tr>
            ) : (
              novelties.map((item: any) => {
                let badgeColor = '#333';
                let textColor = '#FFF';
                
                if (item.type === 'LATE_ARRIVAL') { badgeColor = '#7f1d1d'; textColor = '#fca5a5'; }
                if (item.type === 'OVERTIME') { badgeColor = '#14532d'; textColor = '#86efac'; }
                if (item.type === 'EARLY_DEPARTURE') { badgeColor = '#7c2d12'; textColor = '#fdba74'; }
                if (item.type === 'ON_TIME') { badgeColor = '#1e3a8a'; textColor = '#93c5fd'; }

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{item.user_id}</td>
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
