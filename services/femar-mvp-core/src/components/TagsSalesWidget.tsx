import React from 'react';
import GlassWidget from './GlassWidget';
import { Tag, DollarSign, Users, ArrowUpRight } from 'lucide-react';

export default function TagsSalesWidget() {
  return (
    <GlassWidget title="Control de Venta de TAGs" icon={Tag}>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700 flex flex-col items-center text-center">
            <DollarSign className="w-6 h-6 text-green-400 mb-2" />
            <span className="text-2xl font-bold text-white">$1,250</span>
            <span className="text-xs text-zinc-400">Cobrado (Mes)</span>
          </div>
          <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700 flex flex-col items-center text-center">
            <Users className="w-6 h-6 text-blue-400 mb-2" />
            <span className="text-2xl font-bold text-white">45</span>
            <span className="text-xs text-zinc-400">Clientes Activos</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-medium text-zinc-300">Pendientes por Cobrar</h4>
          {[
            { client: 'Edificio Las Margaritas', amount: 150, due: 'Hoy' },
            { client: 'Condominio El Sol', amount: 300, due: 'Mañana' },
          ].map((item, i) => (
            <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
              <div className="flex flex-col">
                <span className="text-sm text-zinc-200">{item.client}</span>
                <span className="text-xs text-amber-400">Vence: {item.due}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">${item.amount}</span>
                <button className="p-1.5 bg-blue-600/20 text-blue-400 rounded-md hover:bg-blue-600/40 transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors">
          Gestionar Base de Datos de Clientes
        </button>
      </div>
    </GlassWidget>
  );
}
