import React, { useState } from "react";
import { Obra, UserProfile } from "../types";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "../utils";
import ActivityModal from "./ActivityModal";
import {
  Calendar,
  Building,
  DollarSign,
  TrendingUp,
  Sliders,
  CheckCircle,
  FileCheck,
  Edit3,
  Trash2,
  ChevronRight,
  PlusCircle,
  AlertTriangle,
  X
} from "lucide-react";

interface WorkCardProps {
  work: Obra;
  activeUser: UserProfile;
  onLaunchMeasurement: (
    workId: string,
    newProgress: number,
    notes: string,
    updaterName: string,
    updaterRole: string
  ) => Promise<void>;
  onEditClick: (work: Obra) => void;
  onDeleteClick: (workId: string) => Promise<void>;
}

export default function WorkCard({
  work,
  activeUser,
  onLaunchMeasurement,
  onEditClick,
  onDeleteClick
}: WorkCardProps) {
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const statusStyle = getStatusColor(work.status);

  const isCompleted = work.progress === 100 || work.status === "concluida";

  return (
    <article
      className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400 p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 relative overflow-hidden"
      id={`obra-card-${work.id}`}
    >
      {/* Top Section: Contract Badge + Status Pill + Settings */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <span className="inline-block text-[10px] uppercase font-mono bg-slate-100 text-slate-600 border border-slate-200 font-semibold px-2 py-0.5 rounded">
            {work.contractNumber || "Sem número de Contrato"}
          </span>
          <h3 className="text-base md:text-lg font-bold text-slate-900 tracking-tight leading-snug font-sans hover:text-amber-600 transition">
            {work.name}
          </h3>
        </div>

        {/* Status chip */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
          <span className="whitespace-nowrap">{getStatusLabel(work.status)}</span>
        </div>
      </div>

      {/* Main Stats: Contractor & Bid/Licit value */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3.5 bg-slate-50 rounded-xl p-3 border border-slate-150">
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
            <Building className="w-3 h-3 text-slate-400" /> Empreiteira
          </span>
          <span className="text-xs font-bold text-slate-700 truncate block text-ellipsis">
            {work.contractorName}
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-slate-400" /> Valor Licitado
          </span>
          <span className="text-xs font-bold font-mono text-slate-800 block">
            {formatCurrency(work.biddedValue)}
          </span>
        </div>
      </div>

      {/* Timeline Dates Container */}
      <div className="border-t border-b border-slate-100 py-3.5 space-y-2.5 text-xs text-slate-600">
        <div className="flex justify-between items-center bg-transparent">
          <span className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Calendar className="w-3.5 h-3.5" /> Data de Início:
          </span>
          <span className="font-semibold text-slate-700 font-mono">
            {formatDate(work.startDate)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Calendar className="w-3.5 h-3.5" /> Prazo de Execução:
          </span>
          <span className="font-semibold text-slate-700 font-mono">
            {formatDate(work.deadlineDate)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5 text-slate-400 font-medium text-ellipsis">
            <FileCheck className="w-3.5 h-3.5" /> Contrato Vigente até:
          </span>
          <span className="font-semibold text-amber-700 font-mono bg-amber-50 rounded px-1.5 py-0.5 border border-amber-100/50">
            {formatDate(work.activeContractDate)}
          </span>
        </div>
      </div>

      {/* Progress visual tracker block */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            Avanço Concluído
          </span>
          <span className="text-sm font-extrabold text-slate-900 font-mono">
            {work.progress}%
          </span>
        </div>

        {/* Styled indicator meter */}
        <div className="w-full bg-slate-150 h-3 rounded-full overflow-hidden block border border-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isCompleted
                ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                : "bg-gradient-to-r from-amber-500 to-amber-400"
            }`}
            style={{ width: `${Math.min(work.progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Action buttons footer drawer */}
      {showDeleteConfirm ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in-down" id={`delete-confirm-${work.id}`}>
          <div className="space-y-0.5">
            <span className="text-[10px] font-extrabold text-rose-600 block uppercase tracking-wider">Confirmar Exclusão</span>
            <p className="text-[11px] text-rose-700 leading-tight">Deseja remover definitivamente esta obra?</p>
          </div>
          <div className="flex gap-1.5 self-end">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-705 font-bold rounded-lg text-xs transition duration-150 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                try {
                  await onDeleteClick(work.id);
                } catch (err) {
                  console.error(err);
                } finally {
                  setShowDeleteConfirm(false);
                }
              }}
              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-lg text-xs transition duration-150 cursor-pointer flex items-center gap-1"
              id={`delete-confirm-btn-${work.id}`}
            >
              <Trash2 className="w-3 h-3" />
              <span>Sim, Excluir</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-1.5 pt-2">
          <button
            onClick={() => {
              setIsActivityModalOpen(true);
            }}
            className="flex-grow flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-2.5 px-3 rounded-xl text-xs transition duration-150 cursor-pointer"
            id={`lance-btn-${work.id}`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Lançar Atividades</span>
          </button>

          <div className="flex gap-1">
            <button
              onClick={() => onEditClick(work)}
              className="p-2 text-slate-500 hover:text-amber-500 bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-xl transition duration-150 cursor-pointer"
              title="Editar Obra"
              id={`edit-btn-${work.id}`}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-rose-500 hover:text-rose-700 bg-rose-50/50 hover:bg-rose-50 hover:border-rose-200 border border-slate-200 rounded-xl transition duration-150 cursor-pointer"
              title="Remover Obra"
              id={`delete-btn-${work.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Render the advanced weekly activity report dialog is toggled */}
      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        work={work}
        activeUser={activeUser}
        onSubmittingActivity={onLaunchMeasurement}
      />
    </article>
  );
}
