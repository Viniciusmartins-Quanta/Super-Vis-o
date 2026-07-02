import React, { useState, useEffect } from "react";
import { formatCurrency, formatPercent, formatDate } from "../utils";
import { Obra, ContractAdditive, UpdateLog } from "../types";
import {
  FileCheck,
  Building2,
  Briefcase,
  TrendingUp,
  DollarSign,
  Settings2,
  CheckCircle2,
  Calendar,
  Plus,
  Trash2,
  Layers,
  Clock,
  Coins,
  FileText
} from "lucide-react";
import WeeklyReportModal from "./WeeklyReportModal";
import AdditiveTimeline from "./AdditiveTimeline";

interface ContractOverviewProps {
  contractName: string;
  supervisorCompany: string;
  contractValue?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  contractAdditives?: ContractAdditive[];
  works: Obra[];
  logs: UpdateLog[];
  onUpdateSettings: (
    name: string,
    company: string,
    value?: number,
    startDate?: string,
    endDate?: string,
    additives?: ContractAdditive[]
  ) => Promise<void>;
  reportWeek: string;
  setReportWeek: (week: string) => void;
  onGenerateReport: () => void;
}

export default function ContractOverview({
  contractName,
  supervisorCompany,
  contractValue = 3450000,
  contractStartDate = "2025-01-15",
  contractEndDate = "2027-01-15",
  contractAdditives = [],
  works,
  logs = [],
  onUpdateSettings,
  reportWeek,
  setReportWeek,
  onGenerateReport
}: ContractOverviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [tempName, setTempName] = useState(contractName);
  const [tempCompany, setTempCompany] = useState(supervisorCompany);
  const [tempValue, setTempValue] = useState<number>(contractValue);
  const [tempStartDate, setTempStartDate] = useState(contractStartDate);
  const [tempEndDate, setTempEndDate] = useState(contractEndDate);
  const [tempAdditives, setTempAdditives] = useState<ContractAdditive[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Serialize additives array to avoid object reference dependency triggers
  const additivesSerialized = JSON.stringify(contractAdditives);

  // Sync temp state with props when editing starts or props update (only if not actively editing)
  useEffect(() => {
    if (!isEditing) {
      setTempName((prev) => prev !== contractName ? contractName : prev);
      setTempCompany((prev) => prev !== supervisorCompany ? supervisorCompany : prev);
      setTempValue((prev) => prev !== contractValue ? contractValue : prev);
      setTempStartDate((prev) => prev !== contractStartDate ? contractStartDate : prev);
      setTempEndDate((prev) => prev !== contractEndDate ? contractEndDate : prev);
      setTempAdditives((prev) => {
        const prevSerialized = JSON.stringify(prev || []);
        if (prevSerialized === additivesSerialized) {
          return prev;
        }
        return contractAdditives || [];
      });
    }
  }, [contractName, supervisorCompany, contractValue, contractStartDate, contractEndDate, additivesSerialized, isEditing]);

  const totalWorks = works.length;
  const totalWorksValue = works.reduce((sum, w) => sum + w.biddedValue, 0);

  // Compute aditive benefits
  const additivesFinanceTotal = contractAdditives
    .filter((a) => a.type === "financeiro" || a.type === "misto")
    .reduce((sum, a) => sum + (a.value || 0), 0);

  const updatedContractValue = contractValue + additivesFinanceTotal;

  const additivesDaysTotal = contractAdditives
    .filter((a) => a.type === "prazo" || a.type === "misto")
    .reduce((sum, a) => sum + (a.days || 0), 0);

  // Weighted average: (sum of (value * progress)) / (sum of values)
  const weightedProgress = totalWorksValue > 0
    ? works.reduce((sum, w) => sum + w.biddedValue * (w.progress / 100), 0) / totalWorksValue * 100
    : 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateSettings(
        tempName,
        tempCompany,
        tempValue,
        tempStartDate,
        tempEndDate,
        tempAdditives
      );
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Additive handlers during edit mode
  const handleAddAdditive = () => {
    const newAdditive: ContractAdditive = {
      id: "add-" + Date.now(),
      number: `Termo Aditivo nº 0${tempAdditives.length + 1}/${new Date().getFullYear()}`,
      type: "financeiro",
      description: "",
      value: 0,
      days: 0,
      signatureDate: new Date().toISOString().split("T")[0]
    };
    setTempAdditives((prev) => [...prev, newAdditive]);
  };

  const handleUpdateAdditiveField = (
    id: string,
    field: keyof ContractAdditive,
    value: any
  ) => {
    setTempAdditives((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveAdditive = (id: string) => {
    setTempAdditives((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <section className="bg-slate-900 text-white rounded-2xl shadow-xl overflow-hidden border border-slate-800" id="contract-overview-sec">
      {/* Upper header block */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-4 flex-grow w-full">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-medium tracking-wider uppercase">
              <FileCheck className="w-4 h-4" />
              <span>Contrato de Supervisão Ativo</span>
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-6 max-w-4xl bg-slate-950 p-6 rounded-2xl border border-slate-850">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic information fields */}
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-400 font-semibold mb-1">Nome do Contrato de Supervisão</label>
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="w-full bg-slate-900 text-white border border-slate-700 focus:border-amber-400 rounded-lg px-3 py-2 text-xs focus:outline-none font-mono"
                      placeholder="Nome do Contrato"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-400 font-semibold mb-1">Empresa Supervisora</label>
                    <input
                      type="text"
                      value={tempCompany}
                      onChange={(e) => setTempCompany(e.target.value)}
                      className="w-full bg-slate-900 text-white border border-slate-700 focus:border-amber-400 rounded-lg px-3 py-2 text-xs focus:outline-none"
                      placeholder="Empresa Supervisora"
                      required
                    />
                  </div>

                  {/* New baseline numbers */}
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-400 font-semibold mb-1">Valor do Contrato de Supervisão (R$)</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-slate-500 font-mono text-xs">R$</span>
                      <input
                        type="number"
                        value={tempValue}
                        onChange={(e) => setTempValue(Number(e.target.value))}
                        className="w-full bg-slate-900 text-white border border-slate-700 focus:border-amber-400 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none font-mono font-bold"
                        placeholder="Ex: 3450000"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs text-slate-400 font-semibold mb-1">Data Início</label>
                      <input
                        type="date"
                        value={tempStartDate}
                        onChange={(e) => setTempStartDate(e.target.value)}
                        className="w-full bg-slate-900 text-white border border-slate-700 focus:border-amber-400 rounded-lg px-3 py-2 text-xs focus:outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs text-slate-400 font-semibold mb-1">Vigência Final</label>
                      <input
                        type="date"
                        value={tempEndDate}
                        onChange={(e) => setTempEndDate(e.target.value)}
                        className="w-full bg-slate-900 text-white border border-slate-700 focus:border-amber-400 rounded-lg px-3 py-2 text-xs focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Subform space for editing Aditivos */}
                <div className="border-t border-slate-805 pt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-400" />
                      Termos Aditivos do Contrato
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddAdditive}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition duration-150 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Aditivo</span>
                    </button>
                  </div>

                  {tempAdditives.length === 0 ? (
                    <div className="bg-slate-900/50 rounded-xl p-6 text-center text-xs text-slate-500 border border-slate-850">
                      Nenhum aditivo financeiro ou de prazo cadastrado para este contrato.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {tempAdditives.map((add, index) => (
                        <div key={add.id || index} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 relative">
                          <button
                            type="button"
                            onClick={() => handleRemoveAdditive(add.id)}
                            className="absolute top-4 right-4 text-slate-550 hover:text-rose-450 p-1 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Remover Aditivo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Identificação / Numeração</label>
                              <input
                                type="text"
                                value={add.number}
                                onChange={(e) => handleUpdateAdditiveField(add.id, "number", e.target.value)}
                                className="w-full bg-slate-950 text-white border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Tipo de Aditivo</label>
                              <select
                                value={add.type}
                                onChange={(e) => handleUpdateAdditiveField(add.id, "type", e.target.value as any)}
                                className="w-full bg-slate-950 text-white border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-medium"
                              >
                                <option value="financeiro">Financeiro</option>
                                <option value="prazo">Prazo (Tempo)</option>
                                <option value="misto">Misto (Valor + Prazo)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Data Assinatura</label>
                              <input
                                type="date"
                                value={add.signatureDate}
                                onChange={(e) => handleUpdateAdditiveField(add.id, "signatureDate", e.target.value)}
                                className="w-full bg-slate-950 text-white border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Conditional financial value entry */}
                            {(add.type === "financeiro" || add.type === "misto") && (
                              <div>
                                <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Valor de Aditivo Financeiro (R$)</label>
                                <div className="relative flex items-center">
                                  <span className="absolute left-2.5 text-slate-500 font-mono text-xs">R$</span>
                                  <input
                                    type="number"
                                    value={add.value || 0}
                                    onChange={(e) => handleUpdateAdditiveField(add.id, "value", Number(e.target.value))}
                                    className="w-full bg-slate-950 text-white border border-slate-700 focus:border-amber-400 rounded-lg pl-8 pr-2 py-1.5 text-xs focus:outline-none font-mono"
                                    placeholder="Ex: 150000"
                                    required
                                  />
                                </div>
                              </div>
                            )}

                            {/* Conditional extension days entry */}
                            {(add.type === "prazo" || add.type === "misto") && (
                              <div>
                                <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Prorrogação de Prazo (Dias de extensão)</label>
                                <div className="relative flex items-center">
                                  <input
                                    type="number"
                                    value={add.days || 0}
                                    onChange={(e) => handleUpdateAdditiveField(add.id, "days", Number(e.target.value))}
                                    className="w-full bg-slate-950 text-white border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono"
                                    placeholder="Ex: 90"
                                    required
                                  />
                                  <span className="absolute right-3.5 text-slate-500 text-xs font-semibold">dias</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Descrição Sumária do Aditivo</label>
                            <input
                              type="text"
                              value={add.description}
                              onChange={(e) => handleUpdateAdditiveField(add.id, "description", e.target.value)}
                              placeholder="Ex: Reforma nos escopos de serviços de pavimentação do lote..."
                              className="w-full bg-slate-950 text-white border border-slate-700 focus:border-amber-400 rounded-lg px-3 py-1.8 text-xs focus:outline-none"
                              required
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2.5 pt-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold px-6 py-2 rounded-xl text-xs sm:text-sm transition duration-150 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSaving ? "Gravando Atualizações..." : "Salvar Configurações"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTempName(contractName);
                      setTempCompany(supervisorCompany);
                      setTempValue(contractValue);
                      setTempStartDate(contractStartDate);
                      setTempEndDate(contractEndDate);
                      setTempAdditives(contractAdditives);
                      setIsEditing(false);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-6 py-2 rounded-xl text-xs sm:text-sm transition duration-150"
                  >
                    Descartar
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-3">
                  <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white mb-2 font-sans flex items-center gap-2">
                    {contractName || "Carregando Contrato..."}
                  </h1>
                  
                  {/* Supervisor and Dates badges */}
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-slate-300 text-xs font-medium">
                    <div className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-850">
                      <Building2 className="w-3.5 h-3.5 text-amber-500" />
                      <span>Supervisora: <strong className="text-white font-semibold">{supervisorCompany}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-850">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Início: <strong className="text-white font-semibold">{formatDate(contractStartDate)}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-850">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Vigência: <strong className="text-white font-semibold">{formatDate(contractEndDate)}</strong></span>
                      {additivesDaysTotal > 0 && (
                        <span className="text-amber-400 font-bold text-[9px] ml-1 bg-amber-400/15 border border-amber-400/20 px-1 py-0.2 rounded">
                          +{additivesDaysTotal}d
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-block showing financial balance of contract values */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] font-extrabold uppercase tracking-widest">
                    <span>Equilíbrio do Contrato</span>
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[10px] block text-slate-500 font-medium font-sans">Valor Supervisor Pactuado</span>
                    <span className="text-base font-bold text-slate-200 font-mono">{formatCurrency(contractValue)}</span>
                  </div>
                  <div className="border-t border-slate-900 pt-1.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] block text-slate-500 font-medium font-sans">Valor Total Atualizado (+ Aditivos)</span>
                      <span className="text-lg font-extrabold text-amber-450 font-mono">{formatCurrency(updatedContractValue)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="self-start md:self-center flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-amber-400 border border-slate-700 hover:border-amber-500 rounded-xl px-4 py-2 text-xs font-bold transition duration-150 shadow-md cursor-pointer cursor-pointer"
              id="edit-contract-btn"
            >
              <Settings2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Ajustar Contrato</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row (4 metrics widgets) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 bg-slate-900/50">
        {/* Metric 1: Contract Investment Balance */}
        <div className="p-6 flex items-start gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Valor total das obras</span>
            <span className="text-sm md:text-base font-bold text-white font-mono block">
              {formatCurrency(totalWorksValue)}
            </span>
            <span className="text-[10px] text-slate-500 block font-light leading-snug">Soma das obras supervisionadas</span>
          </div>
        </div>

        {/* Metric 2: Quantity of Works */}
        <div className="p-6 flex items-start gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Briefcase className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Obras Supervisionadas</span>
            <span className="text-sm md:text-base font-bold text-white font-mono block">
              {totalWorks} {totalWorks === 1 ? "Obra Cadastrada" : "Obras Cadastradas"}
            </span>
            <span className="text-[10px] text-slate-500 block font-light leading-snug">Demandas técnicas ativas</span>
          </div>
        </div>

        {/* Metric 3: General Execution Weighted */}
        <div className="p-6 flex items-start gap-4 col-span-1 sm:col-span-2 lg:col-span-2">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="space-y-2 flex-grow">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Avanço Físico Ponderado</span>
              <span className="text-base md:text-lg font-extrabold text-emerald-400 font-mono">
                {formatPercent(weightedProgress)}
              </span>
            </div>

            {/* Elegant visual progress tracking bar */}
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden block border border-slate-700">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(weightedProgress, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>0% início</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[9px]">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Ponderado pelo valor licitado de cada lote
              </span>
              <span>100% concluído</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Additive Board Overview Section (Lists all detailed additives on home page card) */}
      <AdditiveTimeline
        additives={contractAdditives}
        contractStartDate={contractStartDate}
      />
      
      <div className="flex justify-end pt-3 border-t border-slate-900 mt-2 px-6">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md"
          >
            <FileText className="w-4 h-4" />
            <span>Gerar Relatório Consolidado</span>
          </button>
      </div>
      
      <WeeklyReportModal 
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onGenerate={onGenerateReport}
        reportWeek={reportWeek}
        setReportWeek={setReportWeek}
        logs={logs}
      />
    </section>
  );
}
