import React, { useState } from "react";
import { Obra, UserProfile } from "../types";
import { X, Plus, Trash2, Save, HelpCircle, Calendar, Sparkles } from "lucide-react";

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  work: Obra;
  activeUser: UserProfile;
  onSubmittingActivity: (
    workId: string,
    newProgress: number,
    notes: string,
    updaterName: string,
    updaterRole: string
  ) => Promise<void>;
}

export default function ActivityModal({
  isOpen,
  onClose,
  work,
  activeUser,
  onSubmittingActivity
}: ActivityModalProps) {
  // 1. INÍCIO DA SEMANA
  const [startDate, setStartDate] = useState("");
  // 2. FINAL DA SEMANA
  const [endDate, setEndDate] = useState("");
  // 3. % FÍSICO EXECUTADO
  const [physicalProgress, setPhysicalProgress] = useState<number>(work.progress);
  
  // 4. SITUAÇÃO DO ADITIVO
  const [aditivoStatus, setAditivoStatus] = useState("Formalizado");
  // 5. ATIVIDADES DA INFRAESTRUTURA DE DADOS
  const [dataInfrastructure, setDataInfrastructure] = useState("N/A");
  // 6. STATUS DO AUMENTO DE CARGA (ENEL)
  const [enelStatus, setEnelStatus] = useState("N/A");
  // 7. STATUS DA SUBESTAÇÃO ELÉTRICA
  const [substationStatus, setSubstationStatus] = useState("N/A");
  // 8. INFORMAÇÃO RELEVANTE
  const [relevantInfo, setRelevantInfo] = useState("N/A");

  // 9. ATIVIDADES DA SEMANA (Array of items)
  const [weeklyActivities, setWeeklyActivities] = useState<string[]>([
    "Alocação de forma e armadura nos trechos..."
  ]);

  // 10. ATIVIDADES DA PRÓXIMA SEMANA (Array of items)
  const [nextWeekActivities, setNextWeekActivities] = useState<string[]>([
    "Concretagem integral dos blocos da viga de coroamento..."
  ]);

  // 11. OBSERVAÇÕES E APONTAMENTOS IMPORTANTES (Array of items)
  const [importantNotes, setImportantNotes] = useState<string[]>([
    "Identificadas trincas superficiais na passarela..."
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [errText, setErrText] = useState("");

  if (!isOpen) return null;

  // Add/Remove item helpers
  const handleAddItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => [...prev, ""]);
  };

  const handleUpdateItem = (
    index: number,
    val: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleRemoveItem = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrText("");

    if (physicalProgress < 0 || physicalProgress > 100) {
      setErrText("O avanço concluído deve estar entre 0% e 100%.");
      return;
    }

    const confirmMessage = `Deseja realmente salvar o relatório de atividades com ${physicalProgress}% de avanço concluído para a obra "${work.name}"?`;

    setIsSaving(true);
    try {
      // Build an elegant, structured markdown block to store in database as Notes log
      const periodHeadline = startDate && endDate 
        ? `Período: ${new Date(startDate + "T12:00:00").toLocaleDateString("pt-BR")} a ${new Date(endDate + "T12:00:00").toLocaleDateString("pt-BR")}` 
        : "Período Semanal não especificado";

      const formattedNotes = `
📋 **RELATÓRIO DE ATIVIDADES DE SUPERVISÃO**
📅 *${periodHeadline}* 

🔹 **Avanço Físico:** ${physicalProgress}% (Lançamento de atividades)
🔹 **Situação do Aditivo:** ${aditivoStatus || "N/A"}
🔹 **Atividades da Infraestrutura de Dados:** ${dataInfrastructure || "N/A"}
🔹 **Status do Aumento de Carga (ENEL):** ${enelStatus || "N/A"}
🔹 **Status da Subestação Elétrica:** ${substationStatus || "N/A"}
🔹 **Informação Relevante:** ${relevantInfo || "N/A"}

🚧 **Atividades da Semana:**
${weeklyActivities.filter(a => a.trim()).map(a => `• ${a}`).join("\n") || "• Nenhuma cadastrada"}

🔮 **Atividades da Próxima Semana:**
${nextWeekActivities.filter(a => a.trim()).map(a => `• ${a}`).join("\n") || "• Nenhuma cadastrada"}

⚠️ **Observações & Apontamentos importantes:**
${importantNotes.filter(a => a.trim()).map(a => `• ${a}`).join("\n") || "• Nenhum apontamento cadastrado"}
      `.trim();

      await onSubmittingActivity(
        work.id,
        physicalProgress,
        formattedNotes,
        activeUser.name,
        activeUser.role
      );

      onClose();
    } catch (err) {
      setErrText("Erro ao gravar atividades.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
      {/* Click outside to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Main Container */}
      <div 
        className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animation-fade-in"
        id="activity-modal-wrapper"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse-slow" />
            <div>
              <h3 className="text-base font-extrabold text-slate-800">
                Lançar Atividades e Progresso
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Obra: <span className="text-slate-700 font-semibold">{work.name}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-450 hover:text-slate-700 p-1.5 hover:bg-slate-200/50 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable form body content matches image perfectly */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          
          {/* Top section group: Dates + Physical progress percent */}
          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. INÍCIO DA SEMANA */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Início da Semana
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none transition font-medium"
                />
              </div>
            </div>

            {/* 2. FINAL DA SEMANA */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Final da Semana
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none transition font-medium"
                />
              </div>
            </div>

            {/* 3. % FÍSICO EXECUTADO */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                % Físico Executado
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={physicalProgress}
                  onChange={(e) => setPhysicalProgress(Math.min(100, Math.max(0, Number(e.target.value))))}
                  placeholder="Ex: 79"
                  className="w-full bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-lg pl-3 pr-8 py-2 text-xs text-slate-800 focus:outline-none transition font-mono font-bold"
                />
                <span className="absolute right-3.5 text-xs text-slate-400 font-bold">%</span>
              </div>
            </div>

          </div>

          {/* Aditivos & Status rows group exactly matching layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 4. SITUAÇÃO DO ADITIVO */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                Situação do Aditivo:
              </label>
              <input
                type="text"
                value={aditivoStatus}
                onChange={(e) => setAditivoStatus(e.target.value)}
                placeholder="Ex: Formalizado"
                className="w-full bg-slate-50/70 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-300 transition"
              />
            </div>

            {/* 5. ATIVIDADES DA INFRAESTRUTURA DE DADOS */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                Atividades da Infraestrutura de Dados:
              </label>
              <input
                type="text"
                value={dataInfrastructure}
                onChange={(e) => setDataInfrastructure(e.target.value)}
                placeholder="Ex: N/A"
                className="w-full bg-slate-50/70 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-300 transition"
              />
            </div>

            {/* 6. STATUS DO AUMENTO DE CARGA (ENEL) */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                Status do Aumento de Carga (ENEL):
              </label>
              <input
                type="text"
                value={enelStatus}
                onChange={(e) => setEnelStatus(e.target.value)}
                placeholder="Ex: N/A"
                className="w-full bg-slate-50/70 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-300 transition"
              />
            </div>

            {/* 7. STATUS DA SUBESTAÇÃO ELÉTRICA */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                Status da Subestação Elétrica:
              </label>
              <input
                type="text"
                value={substationStatus}
                onChange={(e) => setSubstationStatus(e.target.value)}
                placeholder="Ex: N/A"
                className="w-full bg-slate-50/70 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-300 transition"
              />
            </div>

          </div>

          {/* 8. INFORMAÇÃO RELEVANTE */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
              Informação Relevante:
            </label>
            <input
              type="text"
              value={relevantInfo}
              onChange={(e) => setRelevantInfo(e.target.value)}
              placeholder="Ex: N/A"
              className="w-full bg-slate-50/70 border border-slate-200 focus:bg-white rounded-lg px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-300 transition"
            />
          </div>

          {/* Dynamic Item list structures from the image */}
          <div className="border-t border-slate-100 pt-5 space-y-6">
            
            {/* 9. ATIVIDADES DA SEMANA (_/_/_ A _/_/_) WITH PURPLE BADGE ADD BUTTON */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-750 font-sans">
                  ATIVIDADES DA SEMANA:
                </label>
                <button
                  type="button"
                  onClick={() => handleAddItem(setWeeklyActivities)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100/70 px-2.5 py-1 rounded-lg transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Adicionar Item</span>
                </button>
              </div>

              <div className="space-y-2">
                {weeklyActivities.map((act, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={act}
                      onChange={(e) => handleUpdateItem(idx, e.target.value, setWeeklyActivities)}
                      placeholder="Ex: Alocação de forma e armadura nos trechos..."
                      className="flex-grow bg-slate-50 border border-slate-350 focus:border-indigo-400 focus:bg-white focus:outline-none rounded-lg px-3 py-2 text-xs text-slate-800 transition"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx, setWeeklyActivities)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition duration-150"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 10. ATIVIDADES DA PRÓXIMA SEMANA WITH EMERALD BADGE ADD BUTTON */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-755">
                  ATIVIDADES DA PRÓXIMA SEMANA:
                </label>
                <button
                  type="button"
                  onClick={() => handleAddItem(setNextWeekActivities)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100/70 px-2.5 py-1 rounded-lg transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Adicionar Item</span>
                </button>
              </div>

              <div className="space-y-2">
                {nextWeekActivities.map((act, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={act}
                      onChange={(e) => handleUpdateItem(idx, e.target.value, setNextWeekActivities)}
                      placeholder="Ex: Concretagem integral dos blocos da viga de coroamento..."
                      className="flex-grow bg-slate-50 border border-slate-350 focus:border-emerald-400 focus:bg-white focus:outline-none rounded-lg px-3 py-2 text-xs text-slate-800 transition"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx, setNextWeekActivities)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition duration-150"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 11. OBSERVAÇÕES E APONTAMENTOS IMPORTANTES WITH ROSE BADGE ADD BUTTON */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-755">
                  OBSERVAÇÕES E APONTAMENTOS IMPORTANTES:
                </label>
                <button
                  type="button"
                  onClick={() => handleAddItem(setImportantNotes)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100/70 px-2.5 py-1 rounded-lg transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Adicionar Item</span>
                </button>
              </div>

              <div className="space-y-2">
                {importantNotes.map((act, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={act}
                      onChange={(e) => handleUpdateItem(idx, e.target.value, setImportantNotes)}
                      placeholder="Ex: Identificadas trincas superficiais na passarela..."
                      className="flex-grow bg-slate-50 border border-slate-350 focus:border-rose-400 focus:bg-white focus:outline-none rounded-lg px-3 py-2 text-xs text-slate-800 transition"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx, setImportantNotes)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition duration-150"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {errText && (
            <div className="bg-rose-50 border border-rose-200 text-xs text-rose-700 p-3 rounded-xl font-bold text-center">
              {errText}
            </div>
          )}

          {/* Modal Buttons Footer */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-grow bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4.5 h-4.5" />
              <span>{isSaving ? "Gravando Atividades..." : "Confirmar e Registrar Atividades"}</span>
            </button>
            <button
              type="button"
              disabled={isSaving}
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
