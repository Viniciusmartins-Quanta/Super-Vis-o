import React, { useState } from "react";
import { UserProfile, USER_PROFILES } from "../types";
import { Search, SlidersHorizontal, UserCheck, RefreshCw, Layers, Check, X } from "lucide-react";

interface DashboardFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  sortBy: string;
  onSortByChange: (val: string) => void;
  activeUser: UserProfile;
  onActiveUserChange: (profile: UserProfile) => void;
  onResetData: () => void;
}

export default function DashboardFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  activeUser,
  onActiveUserChange,
  onResetData
}: DashboardFiltersProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const statuses = [
    { value: "all", label: "Todas as Obras" },
    { value: "planejamento", label: "Planejamento" },
    { value: "em_andamento", label: "Em Andamento" },
    { value: "paralisada", label: "Paralisada" },
    { value: "concluida", label: "Concluídas" }
  ];

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4" id="dashboard-filters-sec">
      
      {/* Top row: User Profile active context switcher & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        
        {/* Profile Selector */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 w-full md:w-auto">
          <div className="p-1.5 bg-amber-500 rounded-lg text-slate-900">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="flex-grow">
            <span className="block text-[10px] text-slate-400 font-medium tracking-wider uppercase">Operando Como (Usuário Ativo)</span>
            <select
              value={activeUser.name}
              onChange={(e) => {
                const found = USER_PROFILES.find((p) => p.name === e.target.value);
                if (found) onActiveUserChange(found);
              }}
              className="bg-transparent text-slate-800 font-semibold text-sm focus:outline-none cursor-pointer pr-1"
            >
              {USER_PROFILES.map((profile) => (
                <option key={profile.name} value={profile.name} className="text-slate-800 bg-white">
                  {profile.name} ({profile.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Info panel + Reset button */}
        <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
          <span className="text-[11px] text-slate-400 font-mono text-right hidden lg:block">
            Sincronização Ativa em Tempo Real
          </span>
          {showResetConfirm ? (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-xs animate-fade-in-down">
              <span className="text-amber-800 font-medium font-sans">Tem certeza que quer restaurar?</span>
              <button
                onClick={() => {
                  onResetData();
                  setShowResetConfirm(false);
                }}
                className="p-1 text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-md transition duration-100 flex items-center justify-center cursor-pointer"
                title="Confirmar Restauração"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="p-1 text-rose-600 hover:text-white hover:bg-rose-600 rounded-md transition duration-100 flex items-center justify-center cursor-pointer"
                title="Cancelar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 text-slate-500 hover:text-amber-600 bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-lg px-3 py-1.5 text-xs font-medium transition duration-150 cursor-pointer"
              title="Redefinir simulador"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restaurar Padrão</span>
            </button>
          )}
        </div>
      </div>

      {/* Main filter controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        
        {/* Search Input bar */}
        <div className="relative lg:col-span-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-450 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 transition-all font-sans"
            placeholder="Buscar por lote, empreiteira ou contrato..."
          />
        </div>

        {/* Sort Input */}
        <div className="flex items-center gap-2 lg:col-span-3">
          <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Ordenar por:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:bg-white focus:ring-1 focus:ring-amber-400"
          >
            <option value="valorDe">Maior Valor Licitado</option>
            <option value="valorAt">Menor Valor Licitado</option>
            <option value="progressoDe">Maior Avanço Físico</option>
            <option value="progressoAt">Menor Avanço Físico</option>
            <option value="termino">Prazo mais próximo</option>
            <option value="nome">Nome da Obra (A-Z)</option>
          </select>
        </div>

        {/* Status filtering row (Touch chips) */}
        <div className="lg:col-span-5 flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" />
            Filtrar:
          </span>
          {statuses.map((status) => (
            <button
              key={status.value}
              onClick={() => onStatusFilterChange(status.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-100 border ${
                statusFilter === status.value
                  ? "bg-slate-800 text-amber-400 border-slate-800 shadow-sm"
                  : "bg-slate-100 text-slate-600 border-slate-250 hover:bg-slate-200"
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>

      </div>
    </section>
  );
}
