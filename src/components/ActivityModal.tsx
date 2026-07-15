import React, { useState } from "react";
import { Obra, UserProfile, UpdateLog } from "../types";
import { X, Plus, Trash2, Save, HelpCircle, Calendar, Sparkles, Upload, Image as ImageIcon, Camera } from "lucide-react";
import { uploadFotoParaStorage } from "../uploadService";

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
    updaterRole: string,
    coverImage?: string,
    progressImages?: string[]
  ) => Promise<void>;
  onUpdatingActivity?: (
    logId: string,
    newProgress: number,
    notes: string,
    coverImage?: string,
    progressImages?: string[]
  ) => Promise<void>;
  existingLog?: UpdateLog | null;
}

export default function ActivityModal({
  isOpen,
  onClose,
  work,
  activeUser,
  onSubmittingActivity,
  onUpdatingActivity,
  existingLog
}: ActivityModalProps) {
  // 1. INÍCIO DA SEMANA
  const [startDate, setStartDate] = useState("");
  // 2. FINAL DA SEMANA
  const [endDate, setEndDate] = useState("");
  // 3. % FÍSICO EXECUTADO
  const [physicalProgress, setPhysicalProgress] = useState<number>(work.progress);
  
  // 4. SITUAÇÃO DO ADITIVO
  const [aditivoStatus, setAditivoStatus] = useState("N/A");
  // 5. ATIVIDADES DA INFRAESTRUTURA DE DADOS
  const [dataInfrastructure, setDataInfrastructure] = useState("N/A");
  // 6. STATUS DO AUMENTO DE CARGA (ENEL)
  const [enelStatus, setEnelStatus] = useState("N/A");
  // 7. STATUS DA SUBESTAÇÃO ELÉTRICA
  const [substationStatus, setSubstationStatus] = useState("N/A");
  // 8. INFORMAÇÃO RELEVANTE
  const [relevantInfo, setRelevantInfo] = useState("N/A");

  // 9. ATIVIDADES DA SEMANA (String/Textarea)
  const [weeklyActivities, setWeeklyActivities] = useState("");

  // 10. ATIVIDADES DA PRÓXIMA SEMANA (String/Textarea)
  const [nextWeekActivities, setNextWeekActivities] = useState("");

  // 11. OBSERVAÇÕES E APONTAMENTOS IMPORTANTES (String/Textarea)
  const [importantNotes, setImportantNotes] = useState("");

  // 12. FOTOS
  const [coverImage, setCoverImage] = useState<string>("");
  const [progressImages, setProgressImages] = useState<string[]>(["", "", "", ""]);

  const [isSaving, setIsSaving] = useState(false);
  const [errText, setErrText] = useState("");

  React.useEffect(() => {
    if (isOpen && existingLog) {
      // Parse existingLog.notes using similar parsing logic to parseWeeklyReport
      const notesText = existingLog.notes || "";
      
      // Parse Period e.g. "Período: 01/06/2026 a 05/06/2026"
      const periodMatch = notesText.match(/(?:Período|Period):\s*\*?([^\n\r*]+)/i);
      let pStart = "";
      let pEnd = "";
      if (periodMatch) {
        const periodStr = periodMatch[1].trim();
        const periodParts = periodStr.split(/\s+a\s+/);
        
        const parseDateToYYYYMMDD = (ptBrDateStr: string) => {
          const parts = ptBrDateStr.trim().split("/");
          if (parts.length === 3) {
            const day = parts[0].padStart(2, "0");
            const month = parts[1].padStart(2, "0");
            const year = parts[2];
            return `${year}-${month}-${day}`;
          }
          return "";
        };

        if (periodParts[0]) pStart = parseDateToYYYYMMDD(periodParts[0]);
        if (periodParts[1]) pEnd = parseDateToYYYYMMDD(periodParts[1]);
      }
      setStartDate(pStart);
      setEndDate(pEnd);
      
      setPhysicalProgress(existingLog.newProgress);

      // Parse Situação do Aditivo
      const aditivoMatch = notesText.match(/Situação do Aditivo:\*\*?\s*(.*)$/im);
      setAditivoStatus(aditivoMatch ? aditivoMatch[1].trim().replace(/\*/g, '') : "N/A");

      // Atividades da Infraestrutura de Dados
      const infraMatch = notesText.match(/Infraestrutura de Dados:\*\*?\s*(.*)$/im);
      setDataInfrastructure(infraMatch ? infraMatch[1].trim().replace(/\*/g, '') : "N/A");

      // Status do Aumento de Carga (ENEL)
      const enelMatch = notesText.match(/Aumento de Carga \(ENEL\):\*\*?\s*(.*)$/im);
      setEnelStatus(enelMatch ? enelMatch[1].trim().replace(/\*/g, '') : "N/A");

      // Status da Subestação Elétrica
      const subMatch = notesText.match(/Subestação Elétrica:\*\*?\s*(.*)$/im);
      setSubstationStatus(subMatch ? subMatch[1].trim().replace(/\*/g, '') : "N/A");

      // Informação Relevante
      const relevantMatch = notesText.match(/Informação Relevante:\*\*?\s*(.*)$/im);
      setRelevantInfo(relevantMatch ? relevantMatch[1].trim().replace(/\*/g, '') : "N/A");

      // Helper to extract bulleted items:
      const extractSectionBullets = (headerKeyword: string) => {
        const lines = notesText.split("\n");
        let startIdx = -1;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(headerKeyword.toLowerCase())) {
            startIdx = i;
            break;
          }
        }

        if (startIdx === -1) return [];

        const bullets: string[] = [];
        for (let i = startIdx + 1; i < lines.length; i++) {
          const line = lines[i].trim();
          
          if (line.includes("**") && !line.startsWith("•") && !line.startsWith("-") && !line.startsWith("*")) {
            break;
          }

          if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
            const content = line.replace(/^[•\-\*]\s*/, "").trim();
            if (content) bullets.push(content);
          } else if (line !== "" && !line.includes("**") && bullets.length > 0) {
            // Ignore or handle
          } else if (line !== "" && !line.includes("**") && bullets.length === 0) {
            bullets.push(line);
          } else if (bullets.length > 0 && line === "") {
            // empty line
          }
        }
        return bullets;
      };

      const wActs = extractSectionBullets("Atividades da Semana");
      setWeeklyActivities(wActs.join("\n"));

      const nActs = extractSectionBullets("Atividades da Próxima Semana");
      setNextWeekActivities(nActs.join("\n"));

      const obs = extractSectionBullets("Observações & Apontamentos importantes");
      setImportantNotes(obs.join("\n"));

      setCoverImage(existingLog.coverImage || "");
      
      const pImgs = existingLog.progressImages || [];
      const progressSlots = ["", "", "", ""];
      pImgs.forEach((img, index) => {
        if (index < 4) progressSlots[index] = img;
      });
      setProgressImages(progressSlots);
    } else if (isOpen) {
      // Reset to default values when creating a new log
      setStartDate("");
      setEndDate("");
      setPhysicalProgress(work.progress);
      setAditivoStatus("N/A");
      setDataInfrastructure("N/A");
      setEnelStatus("N/A");
      setSubstationStatus("N/A");
      setRelevantInfo("N/A");
      setWeeklyActivities("Alocação de forma e armadura nos trechos...");
      setNextWeekActivities("Concretagem integral dos blocos da viga de coroamento...");
      setImportantNotes("Identificadas trincas superficiais na passarela...");
      setCoverImage("");
      setProgressImages(["", "", "", ""]);
    }
  }, [existingLog, isOpen, work.progress]);

  if (!isOpen) return null;



  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Faz o upload direto para o Supabase Storage
      const urlPublica = await uploadFotoParaStorage(file, `obra-${work.id}/capas`);
      if (urlPublica) {
        setCoverImage(urlPublica); // Salva apenas o link gerado!
      }
    }
  };

  const handleProgressSlotChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Faz o upload direto para o Supabase Storage
      const urlPublica = await uploadFotoParaStorage(file, `obra-${work.id}/progresso`);
      if (urlPublica) {
        setProgressImages((prev) => {
          const copy = [...prev];
          copy[index] = urlPublica; // Salva apenas o link gerado no respectivo slot (1 a 4)!
          return copy;
        });
      }
    }
  };

  const handleRemoveProgressSlot = (index: number) => {
    setProgressImages((prev) => {
      const copy = [...prev];
      copy[index] = "";
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrText("");

    if (!startDate || !endDate) {
      setErrText("Por favor, preencha o Início e o Final da semana.");
      return;
    }

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
${weeklyActivities.split("\n").map(a => a.trim()).filter(Boolean).map(a => `• ${a}`).join("\n") || "• Nenhuma cadastrada"}

🔮 **Atividades da Próxima Semana:**
${nextWeekActivities.split("\n").map(a => a.trim()).filter(Boolean).map(a => `• ${a}`).join("\n") || "• Nenhuma cadastrada"}

⚠️ **Observações & Apontamentos importantes:**
${importantNotes.split("\n").map(a => a.trim()).filter(Boolean).map(a => `• ${a}`).join("\n") || "• Nenhum apontamento cadastrado"}
      `.trim();

      const finalProgressImages = progressImages.filter(img => img !== "");

      if (existingLog && onUpdatingActivity) {
        await onUpdatingActivity(
          existingLog.id,
          physicalProgress,
          formattedNotes,
          coverImage || undefined,
          finalProgressImages.length > 0 ? finalProgressImages : undefined
        );
      } else {
        await onSubmittingActivity(
          work.id,
          physicalProgress,
          formattedNotes,
          activeUser.name,
          activeUser.role,
          coverImage || undefined,
          finalProgressImages.length > 0 ? finalProgressImages : undefined
        );
      }

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
                {existingLog ? "Editar Relatório de Atividade" : "Lançar Atividades e Progresso"}
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

          {/* Dynamic Item list structures from the image changed to spacious textareas */}
          <div className="border-t border-slate-100 pt-5 space-y-6">
            
            {/* 9. ATIVIDADES DA SEMANA */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-750 font-sans">
                ATIVIDADES DA SEMANA:
              </label>
              <textarea
                value={weeklyActivities}
                onChange={(e) => setWeeklyActivities(e.target.value)}
                placeholder="Insira as atividades realizadas na semana, uma por linha..."
                rows={5}
                className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-400 focus:bg-white focus:outline-none rounded-lg px-3.5 py-2.5 text-xs text-slate-800 transition"
              />
            </div>

            {/* 10. ATIVIDADES DA PRÓXIMA SEMANA */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-755 font-sans">
                ATIVIDADES DA PRÓXIMA SEMANA:
              </label>
              <textarea
                value={nextWeekActivities}
                onChange={(e) => setNextWeekActivities(e.target.value)}
                placeholder="Insira as atividades planejadas para a próxima semana, uma por linha..."
                rows={5}
                className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-400 focus:bg-white focus:outline-none rounded-lg px-3.5 py-2.5 text-xs text-slate-800 transition"
              />
            </div>

            {/* 11. OBSERVAÇÕES E APONTAMENTOS IMPORTANTES */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-755 font-sans">
                OBSERVAÇÕES E APONTAMENTOS IMPORTANTES:
              </label>
              <textarea
                value={importantNotes}
                onChange={(e) => setImportantNotes(e.target.value)}
                placeholder="Insira as observações e apontamentos importantes, um por linha..."
                rows={5}
                className="w-full bg-slate-50 border border-slate-300 focus:border-rose-400 focus:bg-white focus:outline-none rounded-lg px-3.5 py-2.5 text-xs text-slate-800 transition"
              />
            </div>

          </div>

          {/* ATTACH REPORT PHOTOS */}
          <div className="border-t border-slate-100 pt-5 space-y-6">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-amber-500 animate-pulse-slow" />
              <span>Anexar Fotos do Relatório Semanal</span>
            </h4>

            {/* 1. WEEK'S COVER PHOTO (FOTO DE CAPA DA SEMANA) */}
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="block text-xs font-bold text-slate-750">
                    Foto de Capa do Relatório Semanal
                  </span>
                  <span className="block text-[10px] text-slate-400 font-medium">
                    Aparece centralizada na Ficha Técnica (página 2)
                  </span>
                </div>
                <label className="relative inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-250 py-1.5 px-3 rounded-lg shadow-3xs cursor-pointer select-none transition duration-150">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Escolher Foto</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleCoverChange} 
                    className="hidden" 
                  />
                </label>
              </div>

              {coverImage ? (
                <div className="relative w-full max-w-xs h-36 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-3xs group">
                  <img 
                    src={coverImage} 
                    alt="Foto de Capa" 
                    className="w-full h-full object-cover" 
                  />
                  <button
                    type="button"
                    onClick={() => setCoverImage("")}
                    className="absolute top-1.5 right-1.5 p-1 bg-rose-600/90 text-white rounded-lg hover:bg-rose-600 transition shadow"
                    title="Excluir capa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="h-16 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-[10px] text-slate-450 font-bold bg-white/40">
                  Frente de obra ou capa da semana não enviada
                </div>
              )}
            </div>

            {/* 2. 4 PROGRESS PHOTOS (4 FOTOS DA OBRA) */}
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/60 space-y-3">
              <div>
                <span className="block text-xs font-bold text-slate-750">
                  Fotos de Acompanhamento da Semana (Máximo 4)
                </span>
                <span className="block text-[10px] text-slate-400 font-medium">
                  Serão dispostas no Registro Fotográfico (página 5) em formato grid 2x2
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((slotIdx) => (
                  <div key={slotIdx} className="space-y-1.5">
                    <span className="block text-[9px] font-bold text-slate-450 uppercase tracking-wide font-mono text-center">
                      Foto {slotIdx + 1}
                    </span>
                    {progressImages[slotIdx] ? (
                      <div className="relative h-24 bg-slate-100 border border-slate-200 rounded-lg overflow-hidden shadow-3xs group">
                        <img 
                          src={progressImages[slotIdx]} 
                          alt={`Foto da obra ${slotIdx + 1}`} 
                          className="w-full h-full object-cover" 
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveProgressSlot(slotIdx)}
                          className="absolute top-1 right-1 p-1 bg-rose-600/95 text-white rounded-md hover:bg-rose-600 transition shadow"
                          title="Remover foto"
                        >
                          <Trash2 className="w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/10 rounded-lg cursor-pointer transition duration-150 relative">
                        <div className="flex flex-col items-center gap-1 text-center p-2">
                          <ImageIcon className="w-4 h-4 text-slate-350" />
                          <span className="text-[9px] font-bold text-slate-400">Anexar</span>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleProgressSlotChange(slotIdx, e)} 
                          className="hidden" 
                        />
                      </label>
                    )}
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
              <span>{isSaving ? "Gravando Atividades..." : existingLog ? "Salvar Alterações" : "Confirmar e Registrar Atividades"}</span>
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
