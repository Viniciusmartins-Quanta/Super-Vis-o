import React, { useState, useEffect } from "react";
import { Obra, ContractAdditive } from "../types";
import { X, Save, Plus, Trash2, Calendar, ClipboardList } from "lucide-react";

interface WorkFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (obraData: Partial<Obra>) => Promise<void>;
  existingObra?: Obra | null;
}

export default function WorkFormModal({
  isOpen,
  onClose,
  onSubmit,
  existingObra,
}: WorkFormModalProps) {
  const [name, setName] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [activeContractDate, setActiveContractDate] = useState("");
  const [progress, setProgress] = useState<number>(0);
  const [contractorName, setContractorName] = useState("");
  const [biddedValue, setBiddedValue] = useState<number>(0);
  const [status, setStatus] = useState<Obra["status"]>("planejamento");

  // Advanced technical fields
  const [biddingNumber, setBiddingNumber] = useState("");
  const [adminProcess, setAdminProcess] = useState("");
  const [termDaysVigencia, setTermDaysVigencia] = useState("");
  const [termDaysExecucao, setTermDaysExecucao] = useState("");
  const [signingDate, setSigningDate] = useState("");
  const [publicationDateJom, setPublicationDateJom] = useState("");
  const [physicalStartDate, setPhysicalStartDate] = useState("");
  const [startOrderDate, setStartOrderDate] = useState("");
  const [additives, setAdditives] = useState<ContractAdditive[]>([]);

  // Additive creation state
  const [newAddNum, setNewAddNum] = useState("");
  const [newAddType, setNewAddType] = useState<ContractAdditive["type"]>("financeiro");
  const [newAddVal, setNewAddVal] = useState<number>(0);
  const [newAddDays, setNewAddDays] = useState<number>(0);
  const [newAddDesc, setNewAddDesc] = useState("");
  const [newAddSigDate, setNewAddSigDate] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (existingObra) {
        setName(existingObra.name || "");
        setContractNumber(existingObra.contractNumber || "");
        setStartDate(existingObra.startDate || "");
        setDeadlineDate(existingObra.deadlineDate || "");
        setActiveContractDate(existingObra.activeContractDate || "");
        setProgress(existingObra.progress || 0);
        setContractorName(existingObra.contractorName || "");
        setBiddedValue(existingObra.biddedValue || 0);
        setStatus(existingObra.status || "planejamento");

        setBiddingNumber(existingObra.biddingNumber || "");
        setAdminProcess(existingObra.adminProcess || "");
        setTermDaysVigencia(existingObra.termDaysVigencia || "");
        setTermDaysExecucao(existingObra.termDaysExecucao || "");
        setSigningDate(existingObra.signingDate || "");
        setPublicationDateJom(existingObra.publicationDateJom || "");
        setPhysicalStartDate(existingObra.physicalStartDate || "");
        setStartOrderDate(existingObra.startOrderDate || "");
        setAdditives(existingObra.additives || []);
      } else {
        // Reset to default
        setName("");
        setContractNumber("");
        setStartDate("");
        setDeadlineDate("");
        setActiveContractDate("");
        setProgress(0);
        setContractorName("");
        setBiddedValue(0);
        setStatus("planejamento");

        setBiddingNumber("");
        setAdminProcess("");
        setTermDaysVigencia("");
        setTermDaysExecucao("");
        setSigningDate("");
        setPublicationDateJom("");
        setPhysicalStartDate("");
        setStartOrderDate("");
        setAdditives([]);
      }
      setError("");
    }
  }, [existingObra, isOpen]);

  if (!isOpen) return null;

  const handleAddAdditive = () => {
    if (!newAddNum || !newAddSigDate) {
      alert("Por favor, informe o número e a data de assinatura do aditivo.");
      return;
    }
    const additive: ContractAdditive = {
      id: "add-" + Date.now(),
      number: newAddNum,
      type: newAddType,
      value: newAddType === "financeiro" || newAddType === "misto" ? Number(newAddVal) : undefined,
      days: newAddType === "prazo" || newAddType === "misto" ? Number(newAddDays) : undefined,
      description: newAddDesc,
      signatureDate: newAddSigDate,
    };
    setAdditives((prev) => [...prev, additive]);
    // Reset inputs
    setNewAddNum("");
    setNewAddType("financeiro");
    setNewAddVal(0);
    setNewAddDays(0);
    setNewAddDesc("");
    setNewAddSigDate("");
  };

  const handleRemoveAdditive = (id: string) => {
    setAdditives((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !contractNumber || !startDate || !deadlineDate || !activeContractDate || !contractorName || biddedValue <= 0) {
      setError("Por favor, preencha todos os campos obrigatórios (*) e informe um valor de contrato válido.");
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({
        name,
        contractNumber,
        startDate,
        deadlineDate,
        activeContractDate,
        progress,
        contractorName,
        biddedValue,
        status,
        biddingNumber,
        adminProcess,
        termDaysVigencia,
        termDaysExecucao,
        signingDate,
        publicationDateJom,
        physicalStartDate,
        startOrderDate,
        additives,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar os dados da obra.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-150">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-extrabold text-slate-800">
              {existingObra ? "Editar Obra Pública" : "Adicionar Nova Obra Pública"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200/50 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-grow">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-xs text-rose-700 p-3 rounded-xl font-bold text-center">
              {error}
            </div>
          )}

          {/* Group 1: Basic Information */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider border-b border-amber-100 pb-1">
              Informações Gerais do Contrato
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Nome da Obra *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Reforma e Ampliação do Hospital Geral"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Empresa Empreiteira (Executora) *
                </label>
                <input
                  type="text"
                  required
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  placeholder="Ex: Construtora Metropolitana Ltda"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Número do Contrato de Execução *
                </label>
                <input
                  type="text"
                  required
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                  placeholder="Ex: CTR-DER-082/2025"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Valor Licitado (R$) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={biddedValue}
                  onChange={(e) => setBiddedValue(Number(e.target.value))}
                  placeholder="Ex: 1250000"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Status Inicial da Obra
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Obra["status"])}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                >
                  <option value="planejamento">Planejamento</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="paralisada">Paralisada</option>
                  <option value="concluida">Concluída</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Avanço Físico Inicial (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => setProgress(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition font-mono"
                />
              </div>
            </div>
          </div>

          {/* Group 2: Project Dates */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider border-b border-amber-100 pb-1">
              Prazos e Datas Oficiais
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Início Contratual *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Término Contratual *
                </label>
                <input
                  type="date"
                  required
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Vigência de Contrato Ativa *
                </label>
                <input
                  type="date"
                  required
                  value={activeContractDate}
                  onChange={(e) => setActiveContractDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Group 3: Technical Details (Bidding, process...) */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider border-b border-amber-100 pb-1">
              Detalhes Técnicos da Administração Pública
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Edital de Licitação
                </label>
                <input
                  type="text"
                  value={biddingNumber}
                  onChange={(e) => setBiddingNumber(e.target.value)}
                  placeholder="Ex: Concorrência 02/2024"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Processo Administrativo
                </label>
                <input
                  type="text"
                  value={adminProcess}
                  onChange={(e) => setAdminProcess(e.target.value)}
                  placeholder="Ex: PROC-18042/2024"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Prazo de Vigência (Dias)
                </label>
                <input
                  type="text"
                  value={termDaysVigencia}
                  onChange={(e) => setTermDaysVigencia(e.target.value)}
                  placeholder="Ex: 540 dias"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Prazo de Execução (Dias)
                </label>
                <input
                  type="text"
                  value={termDaysExecucao}
                  onChange={(e) => setTermDaysExecucao(e.target.value)}
                  placeholder="Ex: 360 dias"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Data de Assinatura
                </label>
                <input
                  type="date"
                  value={signingDate}
                  onChange={(e) => setSigningDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Publicação JOM/Diário
                </label>
                <input
                  type="date"
                  value={publicationDateJom}
                  onChange={(e) => setPublicationDateJom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Início Físico (Efetivo)
                </label>
                <input
                  type="date"
                  value={physicalStartDate}
                  onChange={(e) => setPhysicalStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Ordem de Serviço (O.S.)
                </label>
                <input
                  type="date"
                  value={startOrderDate}
                  onChange={(e) => setStartOrderDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Group 4: Additives */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider border-b border-amber-100 pb-1">
              Termos Aditivos da Obra
            </h4>

            {/* Existing Additives List */}
            {additives.length > 0 ? (
              <div className="overflow-hidden border border-slate-200 rounded-xl divide-y divide-slate-100">
                {additives.map((add) => (
                  <div key={add.id} className="flex items-center justify-between p-3 bg-slate-50 text-xs">
                    <div>
                      <span className="font-extrabold text-slate-800">{add.number}</span>
                      <span className="mx-2 text-slate-300">|</span>
                      <span className="font-bold text-slate-500 capitalize">{add.type}</span>
                      {add.value !== undefined && (
                        <>
                          <span className="mx-2 text-slate-300">|</span>
                          <span className="font-semibold text-emerald-600">
                            + {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(add.value)}
                          </span>
                        </>
                      )}
                      {add.days !== undefined && (
                        <>
                          <span className="mx-2 text-slate-300">|</span>
                          <span className="font-semibold text-indigo-600">+ {add.days} dias</span>
                        </>
                      )}
                      {add.description && <p className="text-[11px] text-slate-500 mt-0.5">{add.description}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAdditive(add.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Remover Aditivo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 font-medium italic">
                Nenhum termo aditivo lançado para este contrato.
              </p>
            )}

            {/* Create New Additive Mini-Form */}
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/60 space-y-3">
              <span className="block text-[11px] font-bold text-slate-700 uppercase">
                Adicionar Aditivo ao Contrato de Execução
              </span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-450 uppercase">
                    Número do Aditivo
                  </label>
                  <input
                    type="text"
                    value={newAddNum}
                    onChange={(e) => setNewAddNum(e.target.value)}
                    placeholder="Ex: Aditivo 01/2026"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-450 uppercase">Tipo</label>
                  <select
                    value={newAddType}
                    onChange={(e) => setNewAddType(e.target.value as ContractAdditive["type"])}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  >
                    <option value="financeiro">Financeiro (Acréscimo)</option>
                    <option value="prazo">Prazo (Prorrogação)</option>
                    <option value="misto">Misto (Valor + Prazo)</option>
                  </select>
                </div>

                {(newAddType === "financeiro" || newAddType === "misto") && (
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-450 uppercase">
                      Valor Adicional (R$)
                    </label>
                    <input
                      type="number"
                      value={newAddVal}
                      onChange={(e) => setNewAddVal(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-600"
                    />
                  </div>
                )}

                {(newAddType === "prazo" || newAddType === "misto") && (
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-450 uppercase">
                      Dias Prorrogados
                    </label>
                    <input
                      type="number"
                      value={newAddDays}
                      onChange={(e) => setNewAddDays(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-indigo-600"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-450 uppercase">
                    Data de Assinatura
                  </label>
                  <input
                    type="date"
                    value={newAddSigDate}
                    onChange={(e) => setNewAddSigDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={newAddDesc}
                  onChange={(e) => setNewAddDesc(e.target.value)}
                  placeholder="Justificativa ou descrição sumária do termo aditivo..."
                  className="flex-grow bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddAdditive}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Anexar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-grow bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
            >
              <Save className="w-4.5 h-4.5" />
              <span>{isSaving ? "Gravando Obra..." : existingObra ? "Salvar Alterações" : "Criar Obra Pública"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-5 py-3 rounded-xl text-xs sm:text-sm transition cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
