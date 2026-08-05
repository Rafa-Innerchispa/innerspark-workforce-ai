import { Settings, ShieldCheck, Fingerprint, Wifi, WifiOff, RefreshCw, Server } from 'lucide-react';
import { mockData } from '../services/mock-data';
import { company, locations } from '../data/company-data';

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-sm text-muted mt-1">Dispositivos biométricos e integraciones</p>
      </div>

      {/* Company info */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <Server size={16} className="text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Empresa</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <p className="text-muted">Razón Social</p>
            <p className="text-foreground font-medium mt-0.5">{company.name}</p>
          </div>
          <div>
            <p className="text-muted">RUC</p>
            <p className="text-foreground font-medium mt-0.5">{company.ruc}</p>
          </div>
          <div>
            <p className="text-muted">Zona Horaria</p>
            <p className="text-foreground font-medium mt-0.5">{company.timezone}</p>
          </div>
          <div>
            <p className="text-muted">Moneda</p>
            <p className="text-foreground font-medium mt-0.5">{company.currency}</p>
          </div>
        </div>
      </div>

      {/* Device status */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Fingerprint size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Dispositivos Biométricos</h2>
          </div>
          <span className="text-[10px] text-muted bg-muted/10 px-2 py-0.5 rounded">
            {mockData.devices.filter(d => d.status === 'online').length}/{mockData.devices.length} en línea
          </span>
        </div>
        <div className="divide-y divide-border">
          {mockData.devices.map(d => (
              <div key={d.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-surface-raised/30 transition-colors">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  d.status === 'online' ? 'bg-success/15 text-success' :
                  d.status === 'offline' ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning'
                }`}>
                  {d.status === 'online' ? <Wifi size={16} /> : <WifiOff size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium">{d.name}</p>
                  <p className="text-[10px] text-muted mt-0.5">{d.model.replace('ZKTeco_', '')} · {d.serial}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="flex items-center gap-1 justify-end">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      d.status === 'online' ? 'bg-success' : d.status === 'offline' ? 'bg-destructive' : 'bg-warning'
                    }`} />
                    <span className={`font-medium ${
                      d.status === 'online' ? 'text-success' : d.status === 'offline' ? 'text-destructive' : 'text-warning'
                    }`}>{d.status === 'online' ? 'En línea' : d.status === 'offline' ? 'Fuera de línea' : 'Mantención'}</span>
                  </p>
                  <p className="text-[10px] text-muted mt-0.5">IP: {d.ipAddress}:{d.port}</p>
                </div>
                <div className="text-right text-[10px] text-muted min-w-[100px]">
                  <p>{d.employeeCount} emp.</p>
                  <p className="mt-0.5">FW: {d.firmwareVersion}</p>
                  <div className={`flex items-center gap-1 justify-end mt-0.5 ${
                    d.lastSyncStatus === 'success' ? 'text-success' : d.lastSyncStatus === 'failed' ? 'text-destructive' : 'text-warning'
                  }`}>
                    <RefreshCw size={8} />
                    <span>{d.lastSyncStatus === 'success' ? 'Sincronizado' : d.lastSyncStatus === 'failed' ? 'Error' : 'Parcial'}</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Locations */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
          <Settings size={16} className="text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Ubicaciones</h2>
        </div>
        <div className="divide-y divide-border">
          {locations.map(loc => (
            <div key={loc.id} className="px-5 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-accent">{loc.name.charAt(0)}</span>
              </div>
              <div>
                <p className="text-sm text-foreground">{loc.name}</p>
                <p className="text-[10px] text-muted">{loc.address}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integration status */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={16} className="text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Integraciones</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="text-sm text-foreground">Speechmatics</p>
              <p className="text-[10px] text-muted">Transcripción de notas de voz</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-muted/20 text-muted">No configurado</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="text-sm text-foreground">Bright Data</p>
              <p className="text-[10px] text-muted">Monitoreo de actualizaciones legales</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-muted/20 text-muted">No configurado</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-foreground">API IA — Revisión de Nómina</p>
              <p className="text-[10px] text-muted">Motor de análisis de anomalías</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-success/10 text-success">Activo (determinista)</span>
          </div>
        </div>
      </div>
    </div>
  );
}