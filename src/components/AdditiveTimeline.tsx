import React from 'react';
import { ContractAdditive } from '../types';
import { formatDate, formatCurrency } from '../utils';
import { Clock, Calendar, AlertCircle, TrendingUp, Briefcase } from 'lucide-react';

interface AdditiveTimelineProps {
  additives: ContractAdditive[];
  contractStartDate: string;
}

export default function AdditiveTimeline({ additives, contractStartDate }: AdditiveTimelineProps) {
  // Sort additives by date
  const sortedAdditives = [...additives].sort((a, b) => new Date(a.signatureDate).getTime() - new Date(b.signatureDate).getTime());

  // Define marker colors based on type
  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'prazo': return 'bg-amber-400';
      case 'financeiro': return 'bg-emerald-500';
      case 'misto': return 'bg-blue-500';
      default: return 'bg-slate-800';
    }
  };

  return (
    <div className="bg-slate-950 rounded-2xl border border-slate-850 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-white">Linha do Tempo de Termos Aditivos</h2>
        <p className="text-sm text-slate-400">Marcos temporais escalonados desde a assinatura de início</p>
        
        {/* Legend */}
        <div className="flex gap-4 text-xs text-slate-400 pt-2">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-white" /> Início</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Aditivo Prazo</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Aditivo Financ.</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Ambos</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Timeline Column */}
        <div className="md:col-span-2 space-y-6 relative">
          {/* Vertical Line */}
          <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-slate-800" />

          {/* Start Point */}
          <div className="relative pl-10">
            <div className="absolute left-0 top-1 w-7 h-7 rounded-full bg-slate-800 border-4 border-slate-950 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-blue-400 font-bold">Março / Data de Assinatura: {formatDate(contractStartDate)}</span>
                <span className="text-slate-500 font-bold uppercase">Início</span>
              </div>
              <h3 className="font-bold text-white">Assinatura do Contrato de Início</h3>
              <p className="text-xs text-slate-400">Início do cronograma original com execução e vigência definidas.</p>
            </div>
          </div>

          {/* Additives */}
          {sortedAdditives.map((add) => (
            <div key={add.id} className="relative pl-10">
              <div className={`absolute left-0 top-1 w-7 h-7 rounded-full border-4 border-slate-950 ${getMarkerColor(add.type)}`} />
              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-blue-400 font-bold">Março / Data de Assinatura: {formatDate(add.signatureDate)}</span>
                  <span className="text-slate-500 font-bold uppercase">Prazo</span>
                </div>
                <h3 className="font-bold text-white">{add.number}</h3>
                <p className="text-xs text-slate-400">{add.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Additives List Column */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white">Aditivos de Termo Contratual</h3>
            <button className="text-xs font-bold text-blue-400 bg-blue-900/30 px-3 py-1 rounded-lg">+ Novo Aditivo</button>
          </div>
          
          <div className="space-y-3">
            {sortedAdditives.map((add) => (
              <div key={add.id} className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-sm">{add.number}</span>
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">PRAZO</span>
                </div>
                <p className="text-xs text-slate-400">Assinatura: {formatDate(add.signatureDate)}</p>
                <p className="text-xs font-bold text-white">Prazo estendido em {add.days} dias</p>
                <p className="text-[10px] text-slate-500 italic">"{add.description}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
