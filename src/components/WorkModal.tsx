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
  
  // New customized fields
  const [biddingNumber, setBiddingNumber] = useState("");
  const [adminProcess, setAdminProcess] = useState("");
  const [termDaysVigencia, setTermDaysVigencia] = useState("12 meses");
  const [termDaysExecucao, setTermDaysExecucao] = useState("12 meses");
  const [signingDate, setSigningDate] = useState("");
  const [publicationDateJom, setPublicationDateJom] = useState("");
  const [physicalStartDate, setPhysicalStartDate] = useState("");
  const [startOrderDate, setStartOrderDate] = useState("");

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
      
      // New customized fields populating
      setBiddingNumber(editingWork.biddingNumber || "");
      setAdminProcess(editingWork.adminProcess || "");
      setTermDaysVigencia(editingWork.termDaysVigencia || "12 meses");
      setTermDaysExecucao(editingWork.termDaysExecucao || "12 meses");
      setSigningDate(editingWork.signingDate || "");
      setPublicationDateJom(editingWork.publicationDateJom || "");
      setPhysicalStartDate(editingWork.physicalStartDate || "");
      setStartOrderDate(editingWork.startOrderDate || "");
    } else {
      setName((prev) => prev !== "" ? "" : prev);
      setContractNumber((prev) => prev !== "" ? "" : prev);
      setContractorName((prev) => prev !== "" ? "" : prev);
      setBiddedValue((prev) => prev !== "" ? "" : prev);
      setStartDate((prev) => prev !== "" ? "" : prev);
      setDeadlineDate((prev) => prev !== "" ? "" : prev);
      setActiveContractDate((prev) => prev !== "" ? "" : prev);
      setProgress((prev) => prev !== 0 ? 0 : prev);
      setStatus((prev) => prev !== "em_andamento" ? "em_andamento" : prev); // match "Em Andamento" default shown in image

      setBiddingNumber("");
      setAdminProcess("");
      setTermDaysVigencia("12 meses");
      setTermDaysExecucao("12 meses");
      setSigningDate("");
      setPublicationDateJom("");
      setPhysicalStartDate("");
      setStartOrderDate("");
    }
    setErrorMessage((prev) => prev !== "" ? "" : prev);
  }, [editingWork, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim()) return setErrorMessage("Por favor, preencha o campo TÍTULO DA FICHA DE OBRA.");
    if (!contractNumber.trim()) return setErrorMessage("Por favor, preencha o campo CONTRATO Nº.");
    if (!contractorName.trim()) return setErrorMessage("Por favor, preencha o campo EMPRESA VENCEDORA.");
    
    const valueNum = Number(biddedValue);
    if (isNaN(valueNum) || valueNum <= 0) {
      return setErrorMessage("O VALOR CONTRATUAL INICIAL deve ser um número válido maior que zero.");
    }

    // Safe helper to calculate future dates based on months string (e.g. "12 meses")
    const addMonths = (dateStr: string, monthsStr: string, defaultMonths = 12): string => {
      const baseDate = dateStr ? new Date(dateStr + "T12:00:00") : new Date();
      if (isNaN(baseDate.getTime())) return new Date().toISOString().split("T")[0];
      const match = (monthsStr || "").match(/\d+/);
      const parsedMonths = match ? parseInt(match[0], 10) : defaultMonths;
      baseDate.setMonth(baseDate.getMonth() + parsedMonths);
      return baseDate.toISOString().split("T")[0];
    };

    // Calculate dates for backward compatibility with timeline tracking
    const computedStartDate = physicalStartDate || signingDate || new Date().toISOString().split("T")[0];
    const computedDeadline = addMonths(physicalStartDate || signingDate || new Date().toISOString().split("T")[0], termDaysExecucao, 12);
    const computedActiveContractDate = addMonths(signingDate || physicalStartDate || new Date().toISOString().split("T")[0], termDaysVigencia, 12);

    setIsSaving(true);
    try {
      const payload: Partial<Obra> = {
        name: name.trim(),
        contractNumber: contractNumber.trim(),
        contractorName: contractorName.trim(),
        biddedValue: valueNum,
        startDate: computedStartDate,
        deadlineDate: computedDeadline,
        activeContractDate: computedActiveContractDate,
        progress,
        status,

        biddingNumber: biddingNumber.trim(),
        adminProcess: adminProcess.trim(),
        termDaysVigencia: termDaysVigencia.trim(),
        termDaysExecucao: termDaysExecucao.trim(),
        signingDate,
        publicationDateJom,
        physicalStartDate,
        startOrderDate,
      };

      if (editingWork) {
        payload.id = editingWork.id;
      }

      await onSave(payload);
      onClose();
    } catch (err) {
      setErrorMessage("Erro ao salvar dados da obra no banco virtual de dados.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Dimmed backdrop overlay */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Card body */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden w-full max-w-2xl z-10 max-h-[92vh] flex flex-col animation-fade-in" id="work-modal-container">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-50 rounded-xl text-orange-600 shadow-xs flex-shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-1.5 leading-tight">
                {editingWork ? "Editar Obra Executiva" : "Cadastrar Nova Obra Executiva"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Insira os termos de início do contrato público
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Scrollable */}
        <form onSubmit={handleSubmit} className="p-6 flex-grow overflow-y-auto space-y-6">
          
          {editingWork && (
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200/60 flex gap-2.5 items-start text-xs text-amber-800">
              <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                As alterações no registro de obra dispararão notificações no histórico, autenticando a operação em nome de: <strong>{activeUser.name}</strong>.
              </span>
            </div>
          )}

          {/* Section 1: DETALHAMENTO & EMPRESA */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-dashed border-slate-100 pb-1.5">
              1. DETALHAMENTO & EMPRESA
            </h3>

            {/* Field 1: TÍTULO DA FICHA DE OBRA */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                TÍTULO DA FICHA DE OBRA *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: TC 60/2022 - Península do Samba – Museu Darcy Ribeiro e Praça das Utopias"
                className="w-full bg-white focus:bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition shadow-2xs"
              />
            </div>

            {/* Fields: CONTRATO Nº and EMPRESA VENCEDORA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  CONTRATO Nº *
                </label>
                <input
                  type="text"
                  required
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                  placeholder="Ex: 60/2023"
                  className="w-full bg-white focus:bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  EMPRESA VENCEDORA (EMPREITEIRA) *
                </label>
                <input
                  type="text"
                  required
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  placeholder="Ex: Monobloco Construção Ltda"
                  className="w-full bg-white focus:bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition shadow-2xs"
                />
              </div>
            </div>

            {/* Fields: CONCORRÊNCIA PÚBLICA and PROCESSO ADMINISTRATIVO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  CONCORRÊNCIA PÚBLICA Nº
                </label>
                <input
                  type="text"
                  value={biddingNumber}
                  onChange={(e) => setBiddingNumber(e.target.value)}
                  placeholder="Ex: 39/2022"
                  className="w-full bg-white focus:bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  PROCESSO ADMINISTRATIVO Nº
                </label>
                <input
                  type="text"
                  value={adminProcess}
                  onChange={(e) => setAdminProcess(e.target.value)}
                  placeholder="Ex: 4200/2022"
                  className="w-full bg-white focus:bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: PRAZOS, DATAS & VALORES MUNICIPAIS */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-dashed border-slate-100 pb-1.5">
              2. PRAZOS, DATAS & VALORES MUNICIPAIS
            </h3>

            {/* Fields: VALOR CONTRATUAL INICIAL, PRAZO VIGÊNCIA, PRAZO EXECUÇÃO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  VALOR CONTRATUAL INICIAL *
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-450 text-sm font-extrabold font-mono">R$</span>
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={biddedValue}
                    onChange={(e) => setBiddedValue(e.target.value)}
                    placeholder="Ex: 4386697.66"
                    className="w-full bg-white focus:bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none font-mono transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  PRAZO VIGÊNCIA INICIAL
                </label>
                <input
                  type="text"
                  value={termDaysVigencia}
                  onChange={(e) => setTermDaysVigencia(e.target.value)}
                  placeholder="12 meses"
                  className="w-full bg-white focus:bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  PRAZO EXECUÇÃO INICIAL
                </label>
                <input
                  type="text"
                  value={termDaysExecucao}
                  onChange={(e) => setTermDaysExecucao(e.target.value)}
                  placeholder="12 meses"
                  className="w-full bg-white focus:bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition shadow-2xs"
                />
              </div>
            </div>

            {/* Fields: DATA ASSINATURA, DATA PUBLICAÇÃO JOM, DATA DE INÍCIO FÍSICA */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  DATA ASSINATURA
                </label>
                <input
                  type="date"
                  value={signingDate}
                  onChange={(e) => setSigningDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none transition shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  DATA PUBLICAÇÃO JOM
                </label>
                <input
                  type="date"
                  value={publicationDateJom}
                  onChange={(e) => setPublicationDateJom(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none transition shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  DATA DE INÍCIO FÍSICA
                </label>
                <input
                  type="date"
                  value={physicalStartDate}
                  onChange={(e) => setPhysicalStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none transition shadow-2xs"
                />
              </div>
            </div>

            {/* Fields: DATA ORDEM INÍCIO, STATUS DE INÍCIO INICIAL and (OPTIONAL) PROGRESS PERCENT SLIDER */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  DATA ORDEM INÍCIO
                </label>
                <input
                  type="date"
                  value={startOrderDate}
                  onChange={(e) => setStartOrderDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none transition shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  STATUS DE INÍCIO INICIAL
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-700 font-bold focus:outline-none shadow-2xs cursor-pointer"
                >
                  <option value="planejamento">Licitando</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="paralisada">Paralisada</option>
                  <option value="concluida">Concluída</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    AVANÇO INICIAL (%)
                  </label>
                  <span className="text-xs font-bold font-mono text-amber-700 bg-amber-50 rounded px-1.5 py-0.2">
                    {progress}%
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-2">
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
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-semibold text-center">
              {errorMessage}
            </div>
          )}

          {/* Modal Actions Footer */}
          <div className="flex gap-2.5 pt-4 border-t border-slate-100 justify-end">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold px-6 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Gravando..." : "Salvar Obra"}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
