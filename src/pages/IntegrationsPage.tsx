import { useState } from 'react';
import { Fingerprint, Wifi, WifiOff, RefreshCw, ShieldCheck, Cpu, Database, ChevronDown, ChevronRight, Globe } from 'lucide-react';
import { mockData } from '../services/mock-data';

const modelLabels: Record<string, string> = {
  ZKTeco_SenseFace_2A: 'SenseFace 2A',
  ZKTeco_WL_Series: 'ZKTeco WL-Series',
  ZKTeco_ADMS: 'ADMS Push',
  mobile_app: 'App Móvil',
};

const protocolLabels: Record<string, string> = {
  TA_PUSH: 'TA_PUSH',
  ADMS: 'ADMS',
  TCP_IP: 'TCP/IP',
  internal_mobile: 'Interno',
};

const locationNames_: Record<string, string> = {
  'loc-001': 'Matriz Quito',
  'loc-002': 'Planta Guayaquil',
  'loc-003': 'Satélite Cuenca',
};

export default function IntegrationsPage() {
  const devices = mockData.devices;
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);

  const toggleEvents = (serial: string) => setExpandedEvents(prev => ({ ...prev, [serial]: !prev[serial] }));

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integraciones</h1>
        <p className="text-sm text-muted mt-1">Dispositivos biométricos y servicios conectados</p>
      </div>

      {/* Device Status */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Fingerprint size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Dispositivos Biométricos</h2>
          </div>
          <span className="text-[10px] text-muted bg-muted/20 px-2 py-0.5 rounded">
            {devices.filter(d => d.status === 'online').length}/{devices.length} en línea
          </span>
        </div>
        <div className="divide-y divide-border">
          {devices.map(d => {
            const online = d.status === 'online';
            return (
              <div key={d.id}>
                <div className="px-5 py-3.5 flex items-center gap-4 hover:bg-surface-raised/30 transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    online ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
                  }`}>
                    {online ? <Wifi size={18} /> : <WifiOff size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium">{d.name}</p>
                    <p className="text-[10px] text-muted mt-0.5">
                      {modelLabels[d.model] || d.model} · {d.serial} · {protocolLabels[d.protocol] || d.protocol}
                    </p>
                    <p className="text-[10px] text-muted">{locationNames_[d.locationId] || d.locationId}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="flex items-center gap-1 justify-end">
                      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-success' : 'bg-destructive'}`} />
                      <span className={`font-medium ${online ? 'text-success' : 'text-destructive'}`}>
                        {online ? 'En línea' : 'Fuera de línea'}
                      </span>
                    </p>
                    <p className="text-[10px] text-muted mt-0.5">FW: {d.firmwareVersion}</p>
                  </div>
                  <div className="text-right text-[10px] text-muted min-w-[110px]">
                    <p>IP: {d.ipAddress}:{d.port}</p>
                    <p className="mt-0.5">{d.employeeCount} empleados</p>
                    <div className={`flex items-center gap-1 justify-end mt-0.5 ${
                      d.lastSyncStatus === 'success' ? 'text-success' :
                      d.lastSyncStatus === 'failed' ? 'text-destructive' : 'text-warning'
                    }`}>
                      <RefreshCw size={8} />
                      <span>{d.lastSyncStatus === 'success' ? 'Sincronizado' : d.lastSyncStatus === 'failed' ? 'Error' : 'Parcial'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleEvents(d.serial)}
                    className="text-muted hover:text-foreground cursor-pointer transition-colors p-1"
                  >
                    {expandedEvents[d.serial] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                </div>

                {/* Expanded normalized event fields */}
                {expandedEvents[d.serial] && (
                  <div className="px-5 py-3 bg-surface-raised/20 border-t border-border/50">
                    <p className="text-[10px] font-semibold text-muted uppercase mb-2">Campos del Evento (normalizado)</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                      {[
                        ['Serial', d.serial],
                        ['Modelo', modelLabels[d.model] || d.model],
                        ['Protocolo', protocolLabels[d.protocol] || d.protocol],
                        ['IP Puerto', `${d.ipAddress}:${d.port}`],
                        ['Última Sinc.', new Date(d.lastSync).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })],
                        ['Estado Sinc.', d.lastSyncStatus],
                        ['Empleados', String(d.employeeCount)],
                        ['Firmware', d.firmwareVersion],
                      ].map(([label, value]) => (
                        <div key={label} className="flex flex-col">
                          <span className="text-muted">{label}</span>
                          <span className="text-foreground font-mono">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Partner Integrations */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <ShieldCheck size={16} className="text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Servicios Conectados</h2>
        </div>
        <div className="divide-y divide-border">
          {/* AI/ML API */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
                  <Cpu size={16} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm text-foreground font-medium">Workforce Review Agent</p>
                  <p className="text-[10px] text-muted">Motor de análisis de nómina y anomalías</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-success/10 text-success">Activo (determinista)</span>
            </div>
            <button
              onClick={() => setExpandedPartner(expandedPartner === 'ai' ? null : 'ai')}
              className="text-[10px] text-accent hover:text-accent/80 cursor-pointer flex items-center gap-1"
            >
              {expandedPartner === 'ai' ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {expandedPartner === 'ai' ? 'Ocultar detalle' : 'Ver detalle'}
            </button>
            {expandedPartner === 'ai' && (
              <div className="mt-3 text-[10px] text-muted space-y-1.5 bg-surface-raised/30 rounded-lg p-3">
                <p><span className="font-medium text-foreground">Modelo:</span> Determinista (reglas configurables)</p>
                <p><span className="font-medium text-foreground">API ML disponible:</span> No configurada — requiere clave de API</p>
                <p><span className="font-medium text-foreground">Cobertura:</span> Excepciones, horas extra, recargos nocturnos, ausencias</p>
                <p><span className="font-medium text-foreground">Próximo:</span> Integración con API ML para detección predictiva de anomalías</p>
              </div>
            )}
          </div>

          {/* Speechmatics */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber/10 flex items-center justify-center">
                  <Globe size={16} className="text-amber" />
                </div>
                <div>
                  <p className="text-sm text-foreground font-medium">Speechmatics</p>
                  <p className="text-[10px] text-muted">Transcripción de notas de voz para justificaciones</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-muted/20 text-muted">Demo simulada</span>
            </div>
            <button
              onClick={() => setExpandedPartner(expandedPartner === 'speech' ? null : 'speech')}
              className="text-[10px] text-accent hover:text-accent/80 cursor-pointer flex items-center gap-1"
            >
              {expandedPartner === 'speech' ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {expandedPartner === 'speech' ? 'Ocultar detalle' : 'Ver detalle'}
            </button>
            {expandedPartner === 'speech' && (
              <div className="mt-3 text-[10px] text-muted space-y-1.5 bg-surface-raised/30 rounded-lg p-3">
                <p><span className="font-medium text-foreground">API Key:</span> No configurada</p>
                <p><span className="font-medium text-foreground">Endpoint:</span> wss://eu.rt.speechmatics.com/v2</p>
                <p><span className="font-medium text-foreground">Idiomas:</span> Español (es-EC), Inglés (en-US)</p>
                <p><span className="font-medium text-foreground">Estado:</span> Integración no activa — demo usa datos sintéticos</p>
                <p className="text-[9px] text-warning">⚠ Requiere conexión a Supabase Edge Function para intercambio de tokens JWT.</p>
              </div>
            )}
          </div>

          {/* Bright Data */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue/10 flex items-center justify-center">
                  <Database size={16} className="text-blue" />
                </div>
                <div>
                  <p className="text-sm text-foreground font-medium">Bright Data — Labor Policy Watch</p>
                  <p className="text-[10px] text-muted">Monitoreo de cambios en legislación laboral ecuatoriana</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-muted/20 text-muted">No configurado</span>
            </div>
            <button
              onClick={() => setExpandedPartner(expandedPartner === 'bright' ? null : 'bright')}
              className="text-[10px] text-accent hover:text-accent/80 cursor-pointer flex items-center gap-1"
            >
              {expandedPartner === 'bright' ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {expandedPartner === 'bright' ? 'Ocultar detalle' : 'Ver detalle'}
            </button>
            {expandedPartner === 'bright' && (
              <div className="mt-3 text-[10px] text-muted space-y-1.5 bg-surface-raised/30 rounded-lg p-3">
                <p><span className="font-medium text-foreground">Fuente:</span> Registro Oficial Ecuador, Ministerio del Trabajo</p>
                <p><span className="font-medium text-foreground">Frecuencia:</span> Escaneo semanal de nuevas publicaciones</p>
                <p><span className="font-medium text-foreground">Alertas:</span> Cambios en salario básico, horas extra, beneficios</p>
                <p><span className="font-medium text-foreground">Estado:</span> Demo — datos simulados. Integración con Bright Data API no activa.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}