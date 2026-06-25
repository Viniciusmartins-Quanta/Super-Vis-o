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
  FileText,
  Edit3,
  Trash2,
  ChevronRight,
  PlusCircle,
  AlertTriangle,
  X,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface WorkCardProps {
  work: Obra;
  activeUser: UserProfile;
  isReorderMode?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onLaunchMeasurement: (
    workId: string,
    newProgress: number,
    notes: string,
    updaterName: string,
    updaterRole: string
  ) => Promise<void>;
  onEditClick: (work: Obra) => void;
  onDeleteClick: (workId: string) => Promise<void>;
  onViewDetail: (work: Obra) => void;
}

export default function WorkCard({
  work,
  activeUser,
  isReorderMode = false,
  onMoveUp,
  onMoveDown,
  onLaunchMeasurement,
  onEditClick,
  onDeleteClick,
  onViewDetail
}: WorkCardProps) {
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const statusStyle = getStatusColor(work.status);

  const isCompleted = work.progress === 100 || work.status === "concluida";

  // Helper to find latest vigência date after aditivos
  const getLatestVigencia = () => {
    if (work.additives && work.additives.length > 0) {
      const withVigencia = work.additives.filter(a => a.newVigenciaDate);
      if (withVigencia.length > 0) {
        return {
          date: withVigencia[withVigencia.length - 1].newVigenciaDate!,
          aditivado: true
        };
      }
    }
    return {
      date: work.activeContractDate || work.signingDate || "",
      aditivado: false
    };
  };

  // Helper to find latest execução date after aditivos
  const getLatestExecucao = () => {
    if (work.additives && work.additives.length > 0) {
      const withExecucao = work.additives.filter(a => a.newExecucaoDate);
      if (withExecucao.length > 0) {
        return {
          date: withExecucao[withExecucao.length - 1].newExecucaoDate!,
          aditivado: true
        };
      }
      const withVigencia = work.additives.filter(a => a.newVigenciaDate);
      if (withVigencia.length > 0) {
        return {
          date: withVigencia[withVigencia.length - 1].newVigenciaDate!,
          aditivado: true
        };
      }
    }
    return {
      date: work.deadlineDate || work.physicalStartDate || "",
      aditivado: false
    };
  };

  const vigenciaInfo = getLatestVigencia();
  const execucaoInfo = getLatestExecucao();
  const inicioDate = work.physicalStartDate || work.startOrderDate || work.startDate || "";

  const getDeadlineWarning = () => {
    if (Number(work.progress) === 100) {
      return {
        type: "completed",
        message: "Concluída!",
        className: "bg-slate-100 text-slate-700 border border-slate-200"
      };
    }

    const vigenciaDateStr = vigenciaInfo.date;
    if (!vigenciaDateStr) return null;

    const parts = vigenciaDateStr.split("-");
    let targetDate: Date;
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed
      const day = parseInt(parts[2], 10);
      targetDate = new Date(year, month, day, 12, 0, 0);
    } else {
      targetDate = new Date(vigenciaDateStr);
    }

    if (isNaN(targetDate.getTime())) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
      return {
        type: "expired",
        message: `Verificar Situação do Aditivo. (${overdueDays} ${overdueDays === 1 ? 'dia se passou' : 'dias se passaram'} do prazo)`,
        className: "bg-rose-50 text-rose-700 border border-rose-200"
      };
    } else if (diffDays <= 45) {
      return {
        type: "warning",
        message: "Perto do Fim do Prazo Contratual.",
        className: "bg-amber-50 text-amber-700 border border-amber-200"
      };
    } else {
      return {
        type: "safe",
        message: "Dentro do Prazo Contratual.",
        className: "bg-emerald-50 text-emerald-700 border border-emerald-200"
      };
    }
  };

  const deadlineWarning = getDeadlineWarning();

  return (
    <article
      className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400 p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 relative overflow-hidden"
      id={`obra-card-${work.id}`}
    >
      {isReorderMode && (
        <div className="bg-amber-500/10 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between gap-2 -mt-1 -mx-1 animate-fade-in mb-2">
          <span className="text-[10px] uppercase font-bold text-slate-800 tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            Posição: <span className="font-mono text-xs bg-white text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">#{(work.order ?? 0) + 1}</span>
          </span>
          <div className="flex gap-1">
            <button
              onClick={onMoveUp}
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg transition cursor-pointer shadow-3xs active:translate-y-[-1px] flex items-center gap-0.5 text-[10px] font-bold"
              title="Mover para cima no relatório"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Subir</span>
            </button>
            <button
              onClick={onMoveDown}
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg transition cursor-pointer shadow-3xs active:translate-y-[1px] flex items-center gap-0.5 text-[10px] font-bold"
              title="Mover para baixo no relatório"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Descer</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Section: Contract Badge + Status Pill + Settings */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <span className="inline-block text-[10px] uppercase font-mono bg-slate-100 text-slate-600 border border-slate-200 font-semibold px-2 py-0.5 rounded">
            {work.contractNumber || "Sem número de Contrato"}
          </span>
          <h3 
            onClick={() => onViewDetail(work)}
            className="text-base md:text-lg font-bold text-slate-900 tracking-tight leading-snug font-sans hover:text-amber-600 transition cursor-pointer flex items-center gap-1 group"
            title="Acessar página de detalhes do contrato"
          >
            <span>{work.name}</span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-transform group-hover:translate-x-0.5 flex-shrink-0" />
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

      {/* Contract Parameters section for municipal terms */}
      {(work.biddingNumber || work.adminProcess || work.termDaysVigencia || work.termDaysExecucao) && (
        <div className="grid grid-cols-2 gap-2.5 text-[11px] bg-slate-50/50 rounded-xl p-3 border border-slate-100">
          {work.biddingNumber && (
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Concorrência</span>
              <span className="font-semibold text-slate-700 truncate block">{work.biddingNumber}</span>
            </div>
          )}
          {work.adminProcess && (
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Proc. Administrativo</span>
              <span className="font-semibold text-slate-700 truncate block">{work.adminProcess}</span>
            </div>
          )}
          {work.termDaysVigencia && (
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Prazo Vigência</span>
              <span className="font-semibold text-slate-700 truncate block">{work.termDaysVigencia}</span>
            </div>
          )}
          {work.termDaysExecucao && (
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Prazo Execução</span>
              <span className="font-semibold text-slate-700 truncate block">{work.termDaysExecucao}</span>
            </div>
          )}
        </div>
      )}

      {/* Timeline Dates Container with rich fields */}
      <div className="border-t border-b border-slate-100 py-3.5 space-y-2.5 text-xs text-slate-600" id={`obra-timeline-dates-${work.id}`}>
        <div className="flex justify-between items-center bg-transparent">
          <span className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Calendar className="w-3.5 h-3.5" /> Data de Início:
          </span>
          <span className="font-semibold text-slate-700 font-mono">
            {formatDate(inicioDate)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5 text-slate-400 font-medium">
            <FileCheck className="w-3.5 h-3.5" /> Vigência do Contrato:
          </span>
          <div className="flex items-center gap-1.5">
            {vigenciaInfo.aditivado && (
              <span className="text-[9px] uppercase font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                Aditivado
              </span>
            )}
            <span className={`font-semibold font-mono ${vigenciaInfo.aditivado ? 'text-amber-700 bg-amber-50/50 px-1.5 py-0.5 rounded border border-amber-100/50' : 'text-slate-700'}`}>
              {formatDate(vigenciaInfo.date)}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Calendar className="w-3.5 h-3.5" /> Prazo de Execução:
          </span>
          <div className="flex items-center gap-1.5">
            {execucaoInfo.aditivado && (
              <span className="text-[9px] uppercase font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                Aditivado
              </span>
            )}
            <span className={`font-semibold font-mono ${execucaoInfo.aditivado ? 'text-amber-700 bg-amber-50/50 px-1.5 py-0.5 rounded border border-amber-100/50' : 'text-slate-700'}`}>
              {formatDate(execucaoInfo.date)}
            </span>
          </div>
        </div>
      </div>

      {/* Alert Banner for Contract Validity */}
      {deadlineWarning && (
        <div className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold shadow-3xs ${deadlineWarning.className}`} id={`obra-deadline-warning-${work.id}`}>
          {deadlineWarning.type === "expired" && <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 animate-pulse" />}
          {deadlineWarning.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />}
          {deadlineWarning.type === "safe" && <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
          {deadlineWarning.type === "completed" && <CheckCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />}
          <span>{deadlineWarning.message}</span>
        </div>
      )}

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
        <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-100">
          <button
            onClick={() => onViewDetail(work)}
            className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2 px-3 rounded-xl text-xs transition duration-150 cursor-pointer border border-slate-250 hover:border-slate-300"
            id={`view-contract-btn-${work.id}`}
            title="Acessar painel completo da obra"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Visualizar Ficha do Contrato</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <div className="flex items-center justify-between gap-1.5">
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
