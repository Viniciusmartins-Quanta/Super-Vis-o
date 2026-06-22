import React, { useState, useEffect } from "react";
import { Obra, UserProfile } from "../types";
import { X, Briefcase, Calendar, Building2, DollarSign, HelpCircle, Save } from "lucide-react";

interface WorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workData: Partial<Obra>) => Promise<void>;
  editingWork?: Obra | null;
  activeUser: UserProfile;
}

export default function WorkModal({
  isOpen,
  onClose,
  onSave,
  editingWork,
  activeUser
}: WorkModalProps) {
  const [name, setName] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [biddedValue, setBiddedValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [activeContractDate, setActiveContractDate] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"planejamento" | "em_andamento" | "paralisada" | "concluida">("planejamento");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (editingWork) {
      setName((prev) => prev !== editingWork.name ? editingWork.name : prev);
      setContractNumber((prev) => prev !== editingWork.contractNumber ? editingWork.contractNumber : prev);
      setContractorName((prev) => prev !== editingWork.contractorName ? editingWork.contractorName : prev);
      setBiddedValue((prev) => {
        const valStr = editingWork.biddedValue.toString();
        return prev !== valStr ? valStr : prev;
      });
      setStartDate((prev) => prev !== editingWork.startDate ? editingWork.startDate : prev);
      setDeadlineDate((prev) => prev !== editingWork.deadlineDate ? editingWork.deadlineDate : prev);
      setActiveContractDate((prev) => prev !== editingWork.activeContractDate ? editingWork.activeContractDate : prev);
      setProgress((prev) => prev !== editingWork.progress ? editingWork.progress : prev);
      setStatus((prev) => prev !== editingWork.status ? editingWork.status : prev);
    } else {
      setName((prev) => prev !== "" ? "" : prev);
      setContractNumber((prev) => prev !== "" ? "" : prev);
      setContractorName((prev) => prev !== "" ? "" : prev);
      setBiddedValue((prev) => prev !== "" ? "" : prev);
      setStartDate((prev) => prev !== "" ? "" : prev);
      setDeadlineDate((prev) => prev !== "" ? "" : prev);
      setActiveContractDate((prev) => prev !== "" ? "" : prev);
      setProgress((prev) => prev !== 0 ? 0 : prev);
      setStatus((prev) => prev !== "planejamento" ? "planejamento" : prev);
    }
    setErrorMessage((prev) => prev !== "" ? "" : prev);
  }, [editingWork, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim()) return setErrorMessage("Insira o nome/lote da obra.");
    if (!contractNumber.trim()) return setErrorMessage("Insira o número do contrato da obra.");
    if (!contractorName.trim()) return setErrorMessage("Insira o nome da empreiteira responsável.");
    
    const valueNum = Number(biddedValue);
    if (isNaN(valueNum) || valueNum <= 0) {
      return setErrorMessage("O valor licitado deve ser um número maior que zero.");
    }

    if (!startDate) return setErrorMessage("Informe a data de início dos serviços.");
    if (!deadlineDate) return setErrorMessage("Informe a data do prazo limite de execução.");
    if (!activeContractDate) return setErrorMessage("Informe a data limite do contrato vigente.");

    setIsSaving(true);
    try {
      const payload: Partial<Obra> = {
        name: name.trim(),
        contractNumber: contractNumber.trim(),
        contractorName: contractorName.trim(),
        biddedValue: valueNum,
        startDate,
        deadlineDate,
        activeContractDate,
        progress,
        status
      };

      if (editingWork) {
        payload.id = editingWork.id;
      }

      await onSave(payload);
      onClose();
    } catch (err) {
      setErrorMessage("Erro ao salvar dados da obra no servidor virtual.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dimmed backdrop overlay */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Card body */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden w-full max-w-lg z-10 max-h-[90vh] flex flex-col animation-fade-in" id="work-modal-container">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-amber-500" />
            <h2 className="text-base md:text-lg font-bold text-slate-800">
              {editingWork ? "Editar Ficha de Obra" : "Adicionar Nova Obra Pública"}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Scrollable */}
        <form onSubmit={handleSubmit} className="p-5 flex-grow overflow-y-auto space-y-4">
          
          {editingWork && (
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200/60 flex gap-2.5 items-start text-xs text-amber-800">
              <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                As alterações na ficha técnica da obra registrada dispararão notificações no histórico compartilhável, registrando a operação em nome de: <strong>{activeUser.name}</strong>.
              </span>
            </div>
          )}

          {/* Form field: Name */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">
              Nome / Identificação da Obra (Lote)*
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Duplicação da BR-277 Lote 2 (km 45 ao 72)"
              className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Form field: Code/Contract */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">
                Contrato da Obra*
              </label>
              <input
                type="text"
                required
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                placeholder="Ex: CTR-DER-104/2024"
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:font-mono transition"
              />
            </div>

            {/* Form field: Value bidded */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-slate-400" /> Valor Licitado (R$)*
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={biddedValue}
                onChange={(e) => setBiddedValue(e.target.value)}
                placeholder="Ex: 45800000"
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:font-mono transition"
              />
            </div>
          </div>

          {/* Form field: Contractor Company */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" /> Empreiteira Responsável*
            </label>
            <input
              type="text"
              required
              value={contractorName}
              onChange={(e) => setContractorName(e.target.value)}
              placeholder="Ex: Egesa Engenharia S.A."
              className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Form field: Start Date */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> Data de Início*
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none transition"
              />
            </div>

            {/* Form field: Deadline */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> Prazo de Execução*
              </label>
              <input
                type="date"
                required
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none transition"
              />
            </div>

            {/* Form field: Validity date */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> Contrato Vigente*
              </label>
              <input
                type="date"
                required
                value={activeContractDate}
                onChange={(e) => setActiveContractDate(e.target.value)}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Form field: Status */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">
                Classificação / Status Operacional
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-lg px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none"
              >
                <option value="planejamento">Planejamento</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="paralisada">Paralisada</option>
                <option value="concluida">Concluída</option>
              </select>
            </div>

            {/* Form field: Progress Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-600">
                  Avanço Concluído Inicial (%)
                </label>
                <span className="text-xs font-bold font-mono text-slate-900 bg-slate-100 rounded px-1.5 py-0.5">
                  {progress}%
                </span>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-semibold text-center">
              {errorMessage}
            </div>
          )}

          {/* Modal Actions Footer */}
          <div className="flex gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold flex-grow py-3 rounded-xl text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Gravando Ficha..." : "Gravar Dados"}</span>
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-5 py-3 rounded-xl text-sm transition cursor-pointer"
            >
              Cancelar
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
