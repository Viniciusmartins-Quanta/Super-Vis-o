import React, { useState } from "react";
import { Obra, UpdateLog, ContractAdditive, UserProfile } from "../types";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "../utils";
import { uploadFotoParaStorage } from "../uploadService";
import {
  ArrowLeft,
  Calendar,
  Building,
  DollarSign,
  TrendingUp,
  Clock,
  Briefcase,
  FileText,
  FileCheck,
  Plus,
  Trash2,
  Paperclip,
  History,
  HardDrive,
  CheckCircle,
  Download,
  FileUp,
  FileSpreadsheet,
  Settings,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Logs,
  PlusCircle,
  Edit3,
  Check,
  ArrowUpRight,
  Upload,
  Camera,
  Image as ImageIcon
} from "lucide-react";
import ActivityModal from "./ActivityModal";

interface WorkDetailProps {
  work: Obra;
  allLogs: UpdateLog[];
  activeUser: UserProfile;
  onBack: () => void;
  onUpdateWork: (updatedWork: Obra) => Promise<void>;
  onEditClick: (work: Obra) => void;
  onLaunchMeasurement: (
    workId: string,
    newProgress: number,
    notes: string,
    updaterName: string,
    updaterRole: string,
    coverImage?: string,
    progressImages?: string[]
  ) => Promise<void>;
  onUpdateLogNotes?: (logId: string, notes: string) => Promise<void>;
  onUpdateLog?: (
    logId: string,
    newProgress: number,
    notes: string,
    coverImage?: string,
    progressImages?: string[]
  ) => Promise<void>;
  onDeleteLog?: (logId: string) => Promise<void>;
  onGenerateReport: () => void; 
}

export default function WorkDetail({
  work,
  allLogs,
  activeUser,
  onBack,
  onUpdateWork,
  onEditClick,
  onLaunchMeasurement,
  onUpdateLogNotes,
  onUpdateLog,
  onDeleteLog,
  onGenerateReport
}: WorkDetailProps) {
  const [activeTab, setActiveTab] = useState<
    "ficha" | "aditivos" | "lancamentos" | "drive" | "revisoes" | "logs"
  >("ficha");

  // Local state for additives form
  const [showAddAdditive, setShowAddAdditive] = useState(false);
  const [editingAdditiveId, setEditingAdditiveId] = useState<string | null>(null);
  const [addNo, setAddNo] = useState("");
  const [addType, setAddType] = useState<"financeiro" | "prazo" | "misto">("financeiro");
  const [addValue, setAddValue] = useState("");
  const [addDays, setAddDays] = useState("");
  const [addDaysVigencia, setAddDaysVigencia] = useState("");
  const [addDaysExecucao, setAddDaysExecucao] = useState("");
  const [addNewVigenciaDate, setAddNewVigenciaDate] = useState("");
  const [addNewExecucaoDate, setAddNewExecucaoDate] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addDate, setAddDate] = useState("");
  const [addPublicationDateJom, setAddPublicationDateJom] = useState("");
  const [isSavingAdditive, setIsSavingAdditive] = useState(false);
  const [additiveError, setAdditiveError] = useState("");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [isWeekDropdownOpen, setIsWeekDropdownOpen] = useState(false);
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<UpdateLog | null>(null);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editNotesText, setEditNotesText] = useState("");

  const handleTimelineImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const urlPublica = await uploadFotoParaStorage(file, `obra-${work.id}/timeline`);
    if (urlPublica) {
      onUpdateWork({ ...work, timelineImage: urlPublica });
    }
  };

  const handleRemoveTimelineImage = () => {
    onUpdateWork({ ...work, timelineImage: "" });
  };

  const parseWeeklyReport = (notesText: string) => {
    const result = {
      period: "Semana não especificada",
      sitacaoAditivo: "N/A",
      infraDados: "N/A",
      enelStatus: "N/A",
      substationStatus: "N/A",
      relevantInfo: "N/A",
      weeklyActivities: [] as string[],
      nextWeekActivities: [] as string[],
      observations: [] as string[],
      isStandardReport: false
    };

    if (!notesText) return result;

    if (notesText.includes("RELATÓRIO DE ATIVIDADES") || notesText.includes("Período:")) {
      result.isStandardReport = true;
    }

    // Parse Period e.g. "Período: 01/06/2026 a 05/06/2526" or "Período Semanal não especificado"
    const periodMatch = notesText.match(/(?:Período|Period):\s*\*?([^\n\r*]+)/i);
    if (periodMatch) {
      result.period = periodMatch[1].trim();
    }

    // Parse Situação do Aditivo e.g. "Situação do Aditivo:** Formalizado" or "Situação do Aditivo: Formalizado"
    const aditivoMatch = notesText.match(/Situação do Aditivo:\*\*?\s*(.*)$/im);
    if (aditivoMatch) {
      result.sitacaoAditivo = aditivoMatch[1].trim().replace(/\*/g, '');
    }

    // Parse Atividades da Infraestrutura de Dados
    const infraMatch = notesText.match(/Infraestrutura de Dados:\*\*?\s*(.*)$/im);
    if (infraMatch) {
      result.infraDados = infraMatch[1].trim().replace(/\*/g, '');
    }

    // Parse Status do Aumento de Carga (ENEL)
    const enelMatch = notesText.match(/Aumento de Carga \(ENEL\):\*\*?\s*(.*)$/im);
    if (enelMatch) {
      result.enelStatus = enelMatch[1].trim().replace(/\*/g, '');
    }

    // Parse Status da Subestação Elétrica
    const subMatch = notesText.match(/Subestação Elétrica:\*\*?\s*(.*)$/im);
    if (subMatch) {
      result.substationStatus = subMatch[1].trim().replace(/\*/g, '');
    }

    // Parse Informação Relevante
    const relevantMatch = notesText.match(/Informação Relevante:\*\*?\s*(.*)$/im);
    if (relevantMatch) {
      result.relevantInfo = relevantMatch[1].trim().replace(/\*/g, '');
    }

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
        
        // If we reach a new major section header, stop
        if (line.includes("**") && !line.startsWith("•") && !line.startsWith("-") && !line.startsWith("*")) {
          // Check if it's just bold bullet list item
          if (!line.startsWith("•") && !line.startsWith("-") && !line.startsWith("*")) {
            break;
          }
        }

        if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
          const content = line.replace(/^[•\-\*]\s*/, "").trim();
          if (content) bullets.push(content);
        } else if (line !== "" && !line.includes("**") && bullets.length > 0) {
          // If plain line after bullet, maybe it's multi-line bullet content, append or ignore
        } else if (line !== "" && !line.includes("**") && bullets.length === 0) {
          // First line without bullet in section
          bullets.push(line);
        } else if (bullets.length > 0 && line === "") {
          // empty line in the middle of bullets, keep going or stop
        }
      }
      return bullets;
    };

    result.weeklyActivities = extractSectionBullets("Atividades da Semana");
    result.nextWeekActivities = extractSectionBullets("Atividades da Próxima Semana");
    result.observations = extractSectionBullets("Observações & Apontamentos importantes");

    // Fallbacks if not formatted standard:
    if (!result.isStandardReport || result.weeklyActivities.length === 0) {
      if (result.weeklyActivities.length === 0 && notesText) {
        // Just extract regular text excluding header elements
        const filteredLines = notesText
          .split("\n")
          .map(l => l.trim())
          .filter(l => l && !l.includes("📋") && !l.includes("📅") && !l.includes("🔹"));
        if (filteredLines.length > 0) {
          result.weeklyActivities = [filteredLines.join(" ")];
        } else {
          result.weeklyActivities = [notesText];
        }
      }
    }

    return result;
  };

  function valorParaExtenso(valor: number): string {
    if (valor === 0) return "Zero reais";
    
    const unidades = ["", "Um", "Dois", "Três", "Quatro", "Cinco", "Seis", "Sete", "Oito", "Nove"];
    const dezenas = ["", "Dez", "Vinte", "Trinta", "Quarenta", "Cinquenta", "Sessenta", "Setenta", "Oitenta", "Noventa"];
    const dezenas10_19 = ["Dez", "Onze", "Doze", "Treze", "Quatorze", "Quinze", "Dezesseis", "Dezessete", "Dezoito", "Dezenove"];
    const centenas = ["", "Cento", "Duzentos", "Trezentos", "Quatrocentos", "Quinhentos", "Seiscentos", "Setecentos", "Oitocentos", "Novecentos"];

    function converterGrupo(n: number): string {
      if (n === 100) return "Cem";
      const c = Math.floor(n / 100);
      const d = Math.floor((n % 100) / 10);
      const u = n % 10;

      let res = centenas[c];
      if (d === 1) {
        if (res) res += " e ";
        res += dezenas10_19[u];
      } else {
        if (d > 1) {
          if (res) res += " e ";
          res += dezenas[d];
        }
        if (u > 0) {
          if (res || d > 1) res += " e ";
          res += unidades[u];
        }
      }
      return res;
    }

    function converterInteiro(n: number): string {
      if (n === 0) return "Zero";
      let res = "";
      const milhoes = Math.floor(n / 1000000);
      const milhares = Math.floor((n % 1000000) / 1000);
      const unidadesSimples = n % 1000;

      if (milhoes > 0) {
        res += converterGrupo(milhoes);
        res += milhoes === 1 ? " Milhão" : " Milhões";
      }

      if (milhares > 0) {
        if (res) {
          res += (unidadesSimples === 0 || milhares % 100 === 0) ? " e " : ", ";
        }
        if (milhares === 1) {
          res += "Mil";
        } else {
          res += converterGrupo(milhares) + " Mil";
        }
      }

      if (unidadesSimples > 0) {
        if (res) {
          res += (unidadesSimples < 100 || unidadesSimples % 100 === 0) ? " e " : ", ";
        }
        res += converterGrupo(unidadesSimples);
      }

      return res;
    }

    const parteInteira = Math.floor(valor);
    const parteDecimal = Math.round((valor - parteInteira) * 100);

    let extenso = converterInteiro(parteInteira);
    extenso += parteInteira === 1 ? " Real" : " Reais";

    if (parteDecimal > 0) {
      extenso += " e " + converterInteiro(parteDecimal);
      extenso += parteDecimal === 1 ? " Centavo" : " Centavos";
    }

    return extenso;
  }

  const handleExportPDF = (log: UpdateLog) => {
    const parsed = parseWeeklyReport(log.notes);
    
    const getNextWeekPeriod = (periodStr: string): string => {
      const dateRegex = /(\d{2})\/(\d{2})\/(\d{4})/g;
      const matches = [...periodStr.matchAll(dateRegex)];
      if (matches.length === 2) {
        const parseDate = (m: RegExpMatchArray) => {
          return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
        };
        const d1 = parseDate(matches[0]);
        const d2 = parseDate(matches[1]);
        
        const nextD1 = new Date(d1.getTime() + 7 * 24 * 60 * 60 * 1000);
        const nextD2 = new Date(d2.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const pad = (n: number) => n.toString().padStart(2, "0");
        return `${pad(nextD1.getDate())}/${pad(nextD1.getMonth() + 1)}/${nextD1.getFullYear()} a ${pad(nextD2.getDate())}/${pad(nextD2.getMonth() + 1)}/${nextD2.getFullYear()}`;
      }
      return "08/06/2026 a 12/06/2026";
    };
    
    // Setup variables with fallbacks to ensure rich populated fields matching official formats
    const biddingNumber = work.biddingNumber || "39/2022";
    const adminProcess = work.adminProcess || "4200/2022";
    const signingDate = work.signingDate ? formatDate(work.signingDate) : formatDate(work.startDate);
    const publicationDateJom = work.publicationDateJom ? formatDate(work.publicationDateJom) : formatDate(work.startDate);
    const startOrderDate = work.startOrderDate ? formatDate(work.startOrderDate) : formatDate(work.startDate);
    const termDaysVigencia = work.termDaysVigencia || "8 meses";
    const termDaysExecucao = work.termDaysExecucao || "8 meses";
    const parsedValueExtenso = valorParaExtenso(work.biddedValue);
    
    // Build Chronological Timeline Milestones Array dynamically matching timeline cards from PDF page 3
    interface TimelineMilestone {
      title: string;
      date: string;
      desc: string;
      badge: string;
      side: "top" | "bottom";
    }

    const contractorUpper = (work.contractorName || "MONOBLOCO").toUpperCase();
    const contractNum = work.contractNumber || "60/2023";
    const procAdmin = work.adminProcess || "4200/2021";
    const milestones: TimelineMilestone[] = [];

    // 1. Initial Contract milestone based on user entries
    const firstSignatureDate = work.signingDate || work.startDate || "";
    if (firstSignatureDate) {
      milestones.push({
        title: `Extrato do Termo de Contrato<br/>(${contractorUpper})`,
        date: formatDate(firstSignatureDate),
        desc: `Extrato do contrato nº ${contractNum}, referente ao processo administrativo nº ${procAdmin} –<br/><br/>Publicação no JOM de ${work.publicationDateJom ? formatDate(work.publicationDateJom) : formatDate(firstSignatureDate)}`,
        badge: "CONTRATO",
        side: "top"
      });
    }

    // 2. Start Order Date (Ordem de Início) if entered by the user
    if (work.startOrderDate) {
      milestones.push({
        title: `Ordem de Serviço de Início<br/>(${contractorUpper})`,
        date: formatDate(work.startOrderDate),
        desc: `Ordem de Início emitida para o início oficial das atividades executivas do contrato de obras de engenharia.`,
        badge: "O.S.",
        side: "bottom"
      });
    }

    // 3. User entered additives
    if (work.additives && work.additives.length > 0) {
      work.additives.forEach((add, idx) => {
        const orderWord = idx === 0 ? "Primeiro" : idx === 1 ? "Segundo" : idx === 2 ? "Terceiro" : `${idx + 1}º`;
        const publishJomDate = add.description ? (add.description.match(/JOM de (\d{2}\/\d{2}\/\d{4})/i)?.[1] || formatDate(add.signatureDate)) : formatDate(add.signatureDate);
        milestones.push({
          title: `Extrato do ${orderWord} Termo de aditivo de Contrato<br/>(${contractorUpper})`,
          date: formatDate(add.signatureDate),
          desc: `Extrato do ${orderWord.toLowerCase()} termo aditivo do contrato nº ${contractNum}, referente ao processo administrativo nº ${procAdmin} –<br/><br/>Publicação no JOM de ${publishJomDate}`,
          badge: `${idx + 1}º ADITIVO`,
          side: idx % 2 === 0 ? "top" : "bottom" // Alternating top/bottom among additives
        });
      });
    }

    // Sort Milestones chronologically to ensure pristine timeline arrows
    milestones.sort((a, b) => {
      const parseDateStr = (str: string) => {
        const parts = str.split("/");
        if (parts.length === 3) {
          return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
        }
        return new Date(str).getTime();
      };
      return parseDateStr(a.date) - parseDateStr(b.date);
    });

    const milestonesHtml = milestones.map((ms) => {
      const isTop = ms.side === "top";
      return `
        <div class="flex-1 flex flex-col items-center relative min-w-[160px] h-[310px]">
          <!-- Intersection dot and date -->
          ${isTop ? `
            <!-- Top Milestone -->
            <div style="position: absolute; top: 0; left: 0; width: 160px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 155px;">
              <!-- Gray Card -->
              <div style="background-color: #dcdcdc; border: 1px solid #a0a0a0; padding: 6px 8px; font-family: 'Calibri', 'Arial', sans-serif; font-size: 8pt; font-style: italic; color: #333333; line-height: 1.25; text-align: center; border-radius: 0px; width: 100%; box-sizing: border-box; min-height: 72px; display: flex; align-items: center; justify-content: center; overflow: hidden; letter-spacing: -0.1px;">
                ${ms.desc}
              </div>
              <!-- Orange Header -->
              <div style="background-color: #f38a51; color: white; border: 1px solid #d36e35; border-top: none; padding: 4px 6px; font-family: 'Arial', sans-serif; font-size: 8.5pt; font-weight: bold; text-align: center; width: 100%; box-sizing: border-box; min-height: 48px; display: flex; align-items: center; justify-content: center; overflow: hidden; text-transform: uppercase; line-height: 1.25; border-radius: 0px;">
                ${ms.title}
              </div>
              <!-- Vertical Link line -->
              <div style="width: 1.5px; height: 35px; background-color: #0c4a6e;"></div>
            </div>
            
            <!-- Red dot intersection point -->
            <div style="position: absolute; top: 151px; left: calc(50% - 4.5px); width: 9px; height: 9px; background-color: #b91c1c; border-radius: 50%; border: 1.5px solid white; z-index: 30; box-shadow: 0 0 2px rgba(0,0,0,0.3);"></div>
            <!-- Date Label below center line -->
            <div style="position: absolute; top: 162px; left: 0; width: 100%; text-align: center; font-family: 'Arial', sans-serif; font-size: 8.5pt; font-weight: bold; color: black; z-index: 30; letter-spacing: -0.1px;">
              ${ms.date}
            </div>
          ` : `
            <!-- Bottom Milestone -->
            <!-- Date Label above center line -->
            <div style="position: absolute; top: 140px; left: 0; width: 100%; text-align: center; font-family: 'Arial', sans-serif; font-size: 8.5pt; font-weight: bold; color: black; z-index: 30; letter-spacing: -0.1px;">
              ${ms.date}
            </div>
            <!-- Red dot intersection point -->
            <div style="position: absolute; top: 151px; left: calc(50% - 4.5px); width: 9px; height: 9px; background-color: #b91c1c; border-radius: 50%; border: 1.5px solid white; z-index: 30; box-shadow: 0 0 2px rgba(0,0,0,0.3);"></div>
            
            <div style="position: absolute; top: 155px; left: 0; width: 160px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; height: 155px;">
               <!-- Vertical Link line -->
              <div style="width: 1.5px; height: 35px; background-color: #0c4a6e;"></div>
              <!-- Orange Header -->
              <div style="background-color: #f38a51; color: white; border: 1px solid #d36e35; border-bottom: none; padding: 4px 6px; font-family: 'Arial', sans-serif; font-size: 8.5pt; font-weight: bold; text-align: center; width: 100%; box-sizing: border-box; min-height: 48px; display: flex; align-items: center; justify-content: center; overflow: hidden; text-transform: uppercase; border-radius: 0px; line-height: 1.25;">
                ${ms.title}
              </div>
              <!-- Gray Card -->
              <div style="background-color: #dcdcdc; border: 1px solid #a0a0a0; padding: 6px 8px; font-family: 'Calibri', 'Arial', sans-serif; font-size: 8pt; font-style: italic; color: #333333; line-height: 1.25; text-align: center; border-radius: 0px; width: 100%; box-sizing: border-box; min-height: 72px; display: flex; align-items: center; justify-content: center; overflow: hidden; letter-spacing: -0.1px;">
                ${ms.desc}
              </div>
            </div>
          `}
        </div>
      `;
    }).join("");

    // Prepare Additives row blocks for unified page 2 contract table
    let cumulativeValue = Number(work.biddedValue);
    let additivesTableRows = "";
    if (work.additives && work.additives.length > 0) {
      additivesTableRows = work.additives.map((add, idx) => {
        const orderWord = `${idx + 1}º ADITIVO`;
        const publishJomDate = add.description ? (add.description.match(/JOM de (\d{2}\/\d{2}\/\d{4})/i)?.[1] || formatDate(add.signatureDate)) : formatDate(add.signatureDate);
        
        const lines = [
          `Data assinatura: <span style="font-weight: bold;">${formatDate(add.signatureDate)}</span>`,
          `Data publicação JOM: <span style="font-weight: bold;">${publishJomDate}</span>`
        ];
        
        if (add.days) {
          lines.push(`Prazo Aditivado: <span style="font-weight: bold;">${add.days} meses</span>`);
        } else if (add.type === "prazo" || add.type === "misto") {
          lines.push(`Prazo Aditivado: <span style="font-weight: bold;">N/A</span>`);
        }
        
        if (add.type === "financeiro" || add.type === "misto") {
          const val = Number(add.value || 0);
          cumulativeValue += val;
          lines.push(`Valor Aditivado: <span style="font-weight: bold;">${formatCurrency(val)}</span>`);
          lines.push(`Novo Valor Contratual: <span style="font-weight: bold;">${formatCurrency(cumulativeValue)}</span>`);
        }
        
        if (add.newVigenciaDate) {
          lines.push(`Novo Prazo Contratual: <span style="font-weight: bold; color: #ea580c;">${formatDate(add.newVigenciaDate)}</span>`);
        }
        
        if (add.newExecucaoDate) {
          lines.push(`Novo Prazo de Execução Contratual: <span style="font-weight: bold; color: #ea580c;">${formatDate(add.newExecucaoDate)}</span>`);
        } else if (add.newVigenciaDate) {
          lines.push(`Novo Prazo de Execução Contratual: <span style="font-weight: bold; color: #ea580c;">${formatDate(add.newVigenciaDate)}</span>`);
        }

        return `
          <tr>
            <td style="text-align: center; vertical-align: middle; font-weight: bold; text-transform: uppercase; width: 25%; font-family: Arial, sans-serif;">
              ${orderWord}
            </td>
            <td style="font-family: Calibri, sans-serif; font-size: 9.2pt; line-height: 1.35; padding: 4px 8px;">${lines.join("<br/>")}</td>
          </tr>
        `;
      }).join("");
    }


    const coverHeight = (work.additives && work.additives.length > 2) ? "35mm" : "50mm";

    // Build whole HTML payload structure
    const pdfHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Relatorio_Semanal_Obra_${work.name.replace(/\s+/g, "_")}_${parsed.period.replace(/[\/\s]+/g, "-")}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              sans: ['Inter', 'sans-serif'],
            }
          }
        }
      }
    </script>
    <style>
      @page {
        size: A4;
        margin: 0 0 15mm 0;
        @bottom-left {
          content: "Página " counter(page);
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          color: #94a3b8;
          font-weight: bold;
          padding-left: 15mm;
          padding-bottom: 10mm;
        }
      }
      @page :first {
        margin: 0;
        @bottom-left {
          content: "";
        }
      }
      body {
        margin: 0;
        padding: 20mm 0;
        background-color: #e2e8f0;
        font-family: 'Inter', sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15mm;
      }
      .page {
        width: 210mm;
        height: 296.8mm;
        max-width: 210mm;
        max-height: 296.8mm;
        box-sizing: border-box;
        overflow: hidden;
        position: relative;
        background-color: white;
        margin: 0;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 20mm 20mm 15mm 20mm;
        border: 1px solid #cbd5e1;
      }
      .expandable-page {
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
      }
      .cover-page {
        background-image: url('/cover.jpg');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
      }
      .watermark-page {
        background-image: url('/timbrado.jpg');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
      }
      .page-footer {
        position: absolute;
        bottom: 10mm;
        left: 10mm;
        font-size: 9px;
        font-family: 'JetBrains Mono', monospace;
        color: #94a3b8;
        font-weight: bold;
      }
      @media print {
        body {
          display: block !important;
          background-color: transparent !important;
          margin: 0 !important;
          padding: 0 !important;
          gap: 0 !important;
        }
        html {
          background-color: transparent !important;
        }
        .page {
          background-color: transparent !important;
          margin: 0 !important;
          box-shadow: none !important;
          border: none !important;
          page-break-after: always;
          break-after: page;
        }
        .cover-page {
          background-color: white !important;
        }
        .watermark-page {
          background-image: none !important;
        }
        .expandable-page {
          page-break-inside: auto;
        }
        .no-print {
          display: none;
        }
        .main-print-table {
          background-color: white !important;
          box-shadow: none !important;
          border: none !important;
          margin: 0 auto !important;
          min-height: 296.8mm !important;
          page-break-after: auto;
          break-after: auto;
        }
      }
      /* Custom line clamp helpers */
      .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
         -webkit-box-orient: vertical;  
        overflow: hidden;
      }
      
      .main-print-table {
        width: 210mm;
        border-collapse: collapse;
        border: 1px solid #cbd5e1;
        margin: 0 auto;
        background-color: white;
        background-image: url('/timbrado.jpg');
        background-size: 100% 100%;
        background-repeat: no-repeat;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
        min-height: 296.8mm;
        box-sizing: border-box;
      }
      .main-print-table thead tr td { height: 15mm; border: none; padding: 0; } 
      .main-print-table tfoot tr td { height: 35mm; border: none; padding: 0; } 
      .main-print-table tbody tr td { padding: 0 15mm; border: none; vertical-align: top; }

      .page-break { page-break-before: always; break-before: page; }

      .black-grid-table {
        border-collapse: collapse !important;
        width: 100% !important;
        border: 1.5px solid #000000 !important;
        font-family: 'Calibri', 'Arial', sans-serif;
        font-size: 8.5pt;
        color: #000000;
        line-height: 0.9 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .black-grid-table tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .black-grid-table td, .black-grid-table th {
        border: 1.5px solid #000000 !important;
        padding: 4px 8px !important;
        color: #000000 !important;
        line-height: 0.9 !important;
      }
    </style>
</head>
<body>


  <!-- PAGE 1: COVER CARD (CAPA) -->
  <div class="page cover-page border border-slate-100 relative">
    <div class="absolute inset-0 z-0">
      <img src="/cover.jpg" class="w-full h-full object-cover" alt="Capa" />
    </div>
    <div class="page-content relative z-10 flex flex-col justify-end h-full">
      <!-- Report titles formatted EXACTLY to instructions: Arial 26, Arial 16, Calibri 12 Orange, Calibri 16 -->
      <div class="mb-[30mm] select-none text-left">
        <h1 style="font-family: Arial, sans-serif; font-size: 26pt; font-weight: bold; color: black; line-height: 1.25; margin: 0 0 6mm 0; text-transform: uppercase;">
          RELATÓRIO SEMANAL DE<br/>
          GERENCIAMENTO E FISCALIZAÇÃO<br/>
          TÉCNICA DE OBRAS
        </h1>
        
        <div style="font-family: Arial, sans-serif; font-size: 16pt; font-weight: bold; color: black; margin: 0 0 6mm 0;">
          ${parsed.period}
        </div>
        
        <div style="font-family: 'Aptos Narrow', 'Aptos', sans-serif; font-size: 12pt; font-weight: bold; color: #f97316; margin: 0 0 5mm 0; text-transform: uppercase;">
          TERMO DE CONTRATO Nº 26/2025
        </div>
        
        <p style="font-family: Calibri, sans-serif; font-size: 16pt; font-weight: bold; color: black; line-height: 1.35; max-width: 630px; margin: 0;">
          Empresa especializada em engenharia para realização de serviços técnicos de Assessoramento, Gerenciamento, Supervisão, Fiscalização Técnica e Controle Tecnológico das obras que serão desenvolvidas no município de Maricá/RJ, no âmbito da CODEMAR.
        </p>
      </div>

    </div>
  </div>


  <!-- PAGE 2: FICHA TÉCNICA CONTRATUAL (DETALHES DO CONTRATO) -->
  <div class="page-break"></div>
  <table class="main-print-table">
    <thead><tr><td></td></tr></thead>
    <tbody>
      <tr><td>
        <div class="flex-grow my-4 flex flex-col justify-start">
          <!-- Contract Title banner with background orange, black Arial 11pt bold text -->
          <div style="background-color: #f97316; border: 0.3mm solid black; border-radius: 0px; padding: 7px 12px; text-align: center; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            <h2 style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: black; margin: 0; text-transform: uppercase; letter-spacing: 0.1px;">
              ${work.name}
            </h2>
          </div>
          
          <!-- Space for the cover photo of the week (using log.coverImage if loaded, else fallback blueprint design) -->
          <div class="border border-black flex items-center justify-center relative overflow-hidden mb-3 bg-slate-50 shadow-2xs" style="border-width: 0.3mm; height: ${coverHeight};">
            ${log.coverImage ? `
              <img src="${log.coverImage}" class="w-full h-full object-contain" alt="Foto da Capa da Semana" />
            ` : `
              <div class="border border-slate-200 bg-white/90 shadow-sm rounded-none px-10 py-8 max-w-sm text-center border-dashed font-mono space-y-4">
                <span class="text-slate-405 text-3xl block">📷</span>
                <div>
                  <span class="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold block">FOTO DE CAPA DA OBRA</span>
                  <h4 class="text-xs font-black text-slate-800 uppercase mt-1">Supervisão de Execução Técnica</h4>
                  <p class="text-[9.5px] text-slate-450 mt-1 font-sans">Nenhuma foto de capa enviada para este boletim semanal</p>
                </div>
              </div>
            `}
          </div>

          <!-- Contract Parameter Table perfectly resembling example -->
          <table class="black-grid-table" style="margin-top: 5px;">
            <tbody>
              <tr>
                <td style="font-weight: bold; width: 45%;">Contrato N°:</td>
                <td style="font-weight: bold;">${work.contractNumber}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Concorrência Pública:</td>
                <td>${biddingNumber}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Proc. Administrativo:</td>
                <td>${adminProcess}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Assinatura Contrato:</td>
                <td>${signingDate}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Publicação no JOM:</td>
                <td>${publicationDateJom}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Ordem de Início:</td>
                <td>${startOrderDate}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Empresa Vencedora:</td>
                <td style="text-transform: uppercase;">${work.contractorName}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Prazo Vigência:</td>
                <td>${termDaysVigencia}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Prazo Execução:</td>
                <td>${termDaysExecucao}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Início de Atividades:</td>
                <td>${formatDate(work.startDate)}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Valor Total Inicial:</td>
                <td style="font-weight: bold;">
                  ${formatCurrency(work.biddedValue)} <span style="font-size: 8pt; font-weight: normal; font-style: italic;">(${parsedValueExtenso})</span>
                </td>
              </tr>
              ${additivesTableRows}
            </tbody>
          </table>
        </div>
      </td></tr>
    </tbody>
    <tfoot><tr><td></td></tr></tfoot>
  </table>


  <!-- PAGE 3: CONTRATUAL TIMELINE & CHRONOLOGY CHRONOGRAM -->
  <div class="page-break"></div>
  <table class="main-print-table">
    <thead><tr><td></td></tr></thead>
    <tbody>
      <tr><td>
        <div class="flex-grow my-4 flex flex-col justify-start">
          <div>
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest border-l-2 border-orange-500 pl-2">
              CRONOLOGIA DA OBRA — ${work.name}
            </h3>
          </div>

          <!-- Place for User inserted Chronology -->
          ${work.timelineImage ? `
            <div class="mt-4">
              <img src="${work.timelineImage}" alt="Cronograma da Obra" class="max-w-full h-auto" style="max-height: 200mm; object-fit: contain; margin: 0 auto; display: block;" />
            </div>
          ` : `
            <div class="mt-4 p-4 border-2 border-dashed border-slate-300 rounded-none text-slate-500 text-xs text-center">
              Inserir cronologia da obra aqui.
            </div>
          `}
        </div>
      </td></tr>
    </tbody>
    <tfoot><tr><td></td></tr></tfoot>
  </table>


  <!-- PAGE 4: ATIVIDADES DA SEMANA (MEDICAO SEMANAL) -->
  <div class="page-break"></div>
  <table class="main-print-table">
    <thead><tr><td></td></tr></thead>
    <tbody>
      <tr><td>
        <div style="background-color: #f97316; border: 0.3mm solid black; padding: 6px 10px; text-align: center; margin-bottom: 8px;">
          <h2 style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: black; margin: 0; text-transform: uppercase;">
            ATIVIDADES DE FISCALIZAÇÃO — ${work.name}
          </h2>
        </div>
        <table class="black-grid-table">
          <tbody>
            <tr>
              <td style="font-weight: bold; width: 42%;">% Físico executado:</td>
              <td style="font-weight: bold;">${log.newProgress}%</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Situação do Aditivo:</td>
              <td>${parsed.sitacaoAditivo || "N/A"}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Informação Relevante:</td>
              <td>${parsed.relevantInfo || "N/A"}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Atividades de Infraestrutura de Dados:</td>
              <td>${parsed.infraDados || "N/A"}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Status aumento de carga (Enel):</td>
              <td>${parsed.enelStatus || "N/A"}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Status da Subestação Elétrica:</td>
              <td>${parsed.substationStatus || "N/A"}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; vertical-align: top;">Atividades da semana: <br/><span style="font-weight: normal; font-size: 8pt;">${parsed.period}</span></td>
              <td style="vertical-align: top; padding: 4px 8px;">
                <ul style="list-style-type: none; margin: 0; padding: 0;">
                  ${parsed.weeklyActivities.map(act => `
                    <li style="margin-top: 4px; padding-left: 12px; position: relative; font-family: 'Calibri', 'Arial', sans-serif; font-size: 9.2pt; font-weight: normal;">
                      <span style="position: absolute; left: 0; top: 0;">•</span>
                      ${act}
                    </li>
                  `).join("") || `<li style="margin-top: 4px; font-style: italic; color: #777;">Nenhuma atividade descrita para a semana registrada.</li>`}
                </ul>
              </td>
            </tr>
            <tr>
              <td style="font-weight: bold; vertical-align: top;">Atividades da próxima semana: <br/><span style="font-weight: normal; font-size: 8pt;">${getNextWeekPeriod(parsed.period)}</span></td>
              <td style="vertical-align: top; padding: 4px 8px;">
                <ul style="list-style-type: none; margin: 0; padding: 0;">
                  ${parsed.nextWeekActivities.map(act => `
                    <li style="margin-top: 4px; padding-left: 12px; position: relative; font-family: 'Calibri', 'Arial', sans-serif; font-size: 9.2pt; font-weight: normal;">
                      <span style="position: absolute; left: 0; top: 0;">•</span>
                      ${act}
                    </li>
                  `).join("") || `<li style="margin-top: 4px; font-style: italic; color: #777;">Nenhuma atividade programada de frentes futuras.</li>`}
                </ul>
              </td>
            </tr>
            <tr>
              <td style="font-weight: bold; vertical-align: top;">Observações e apontamentos importantes:</td>
              <td style="vertical-align: top; padding: 4px 8px;">
                <ul style="list-style-type: none; margin: 0; padding: 0;">
                  ${parsed.observations.map(obs => {
                    const cleaned = obs.trim();
                    if (cleaned.toLowerCase().startsWith("não conformidade") || cleaned.toLowerCase().startsWith("nao conformidade")) {
                      const content = cleaned.replace(/^não conformidade:?/i, "").replace(/^nao conformidade:?/i, "").trim();
                      return `
                        <li style="margin-top: 4px; font-family: 'Calibri', 'Arial', sans-serif; font-size: 9.2pt;">
                          <strong style="color: #000000; font-family: 'Arial', sans-serif; font-size: 9.2pt;">Não conformidade</strong><br/>
                          ${content}
                        </li>
                      `;
                    }
                    return `
                      <li style="margin-top: 4px; padding-left: 12px; position: relative; font-family: 'Calibri', 'Arial', sans-serif; font-size: 9.2pt; font-weight: normal;">
                        <span style="position: absolute; left: 0; top: 0;">•</span>
                        ${cleaned}
                      </li>
                    `;
                  }).join("") || `<li style="margin-top: 4px; font-style: italic; color: #777;">Nenhum apontamento crítico de fiscalização registrado no período semanal.</li>`}
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </td></tr>
    </tbody>
    <tfoot><tr><td></td></tr></tfoot>
  </table>


  <!-- PAGE 5: REGISTRO FOTOGRÁFICO DE MARCOS (FOTOS DA OBRA) -->
  <div class="page-break"></div>
  <table class="main-print-table">
    <thead><tr><td></td></tr></thead>
    <tbody>
      <tr><td>
        <div style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: black; margin-bottom: 4mm; text-transform: uppercase;">
          FOTOS DA SEMANA — ${work.name}:
        </div>
        
        <!-- Thick 1.5px solid black border enclosing 4 photos beautifully -->
        <div style="border: 0.3mm solid black; padding: 10px; background-color: #ffffff; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; align-content: start;">
          <!-- PHOTO 1 -->
          <div style="border: 1px solid #000000; aspect-ratio: 1.34; overflow: hidden; display: flex; align-items: center; justify-content: center; background-color: #f3f4f6; position: relative;">
            ${log.progressImages && log.progressImages[0] ? `
              <img src="${log.progressImages[0]}" style="width: 100%; height: 100%; object-fit: cover;" alt="Registro Foto 1" />
            ` : `
              <div style="text-align: center; font-family: monospace; font-size: 9px; color: #a0a0a0;">
                <div>📷</div>
                <div>F-01 (Vazio)</div>
              </div>
            `}
          </div>

          <!-- PHOTO 2 -->
          <div style="border: 1px solid #000000; aspect-ratio: 1.34; overflow: hidden; display: flex; align-items: center; justify-content: center; background-color: #f3f4f6; position: relative;">
            ${log.progressImages && log.progressImages[1] ? `
              <img src="${log.progressImages[1]}" style="width: 100%; height: 100%; object-fit: cover;" alt="Registro Foto 2" />
            ` : `
              <div style="text-align: center; font-family: monospace; font-size: 9px; color: #a0a0a0;">
                <div>📷</div>
                <div>F-02 (Vazio)</div>
              </div>
            `}
          </div>

          <!-- PHOTO 3 -->
          <div style="border: 1px solid #000000; aspect-ratio: 1.34; overflow: hidden; display: flex; align-items: center; justify-content: center; background-color: #f3f4f6; position: relative;">
            ${log.progressImages && log.progressImages[2] ? `
              <img src="${log.progressImages[2]}" style="width: 100%; height: 100%; object-fit: cover;" alt="Registro Foto 3" />
            ` : `
              <div style="text-align: center; font-family: monospace; font-size: 9px; color: #a0a0a0;">
                <div>📷</div>
                <div>F-03 (Vazio)</div>
              </div>
            `}
          </div>

          <!-- PHOTO 4 -->
          <div style="border: 1px solid #000000; aspect-ratio: 1.34; overflow: hidden; display: flex; align-items: center; justify-content: center; background-color: #f3f4f6; position: relative;">
            ${log.progressImages && log.progressImages[3] ? `
              <img src="${log.progressImages[3]}" style="width: 100%; height: 100%; object-fit: cover;" alt="Registro Foto 4" />
            ` : `
              <div style="text-align: center; font-family: monospace; font-size: 9px; color: #a0a0a0;">
                <div>📷</div>
                <div>F-04 (Vazio)</div>
              </div>
            `}
          </div>
        </div>
      </td></tr>
    </tbody>
    <tfoot><tr><td></td></tr></tfoot>
  </table>

  <script>
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        window.print();
      }, 500);
    });
  </script>

</body>
</html>
    `.trim();

    // Open a raw standalone printable document window that runs under standard button triggers seamlessly
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(pdfHtml);
      printWindow.document.close();
    } else {
      // Fallback alert if popups are fully blocked, indicating to unlock them politely
      alert("Habilite permissões para popups no seu navegador para gerar o visualizador de impressão do PDF.");
    }
  };

  // Local state for Mock Drive Attachments
  const [mockFiles, setMockFiles] = useState([
    {
      id: "f-1",
      name: "Memorial_Descritivo_Samba.pdf",
      size: "2.4 MB",
      date: "2024-05-20",
      uploadedBy: "Supervisor"
    },
    {
      id: "f-2",
      name: "Termo_Compromisso_CP39.pdf",
      size: "1.8 MB",
      date: "2024-06-12",
      uploadedBy: "Supervisor"
    }
  ]);
  const [dragActive, setDragActive] = useState(false);
  const [dummyFileText, setDummyFileText] = useState("");

  const statusStyle = getStatusColor(work.status);

  // Filter logs specifically belonging to this work and sort chronologically (newest week on top)
  const getLogStartDate = (notesText: string, timestamp: string): number => {
    if (notesText) {
      const periodMatch = notesText.match(/(?:Período|Period):\s*\*?([^\n\r*]+)/i);
      if (periodMatch) {
        const periodStr = periodMatch[1].trim();
        const dateMatch = periodStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dateMatch) {
          const [_, day, month, year] = dateMatch;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime();
        }
      }
    }
    return new Date(timestamp || 0).getTime();
  };

  const workLogs = allLogs
    .filter((log) => log.workId === work.id)
    .sort((a, b) => {
      const aTime = getLogStartDate(a.notes, a.timestamp);
      const bTime = getLogStartDate(b.notes, b.timestamp);
      if (aTime !== bTime) {
        return bTime - aTime; // descending (newest on top)
      }
      return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
    });

  // Calculation for additives finance metrics
  const originalValue = work.biddedValue;
  const currentAdditives = work.additives || [];
  const totalFinancialAdditives = currentAdditives.reduce((acc, curr) => {
    if (curr.type === "financeiro" || curr.type === "misto") {
      return acc + (curr.value || 0);
    }
    return acc;
  }, 0);
  const updatedValue = originalValue + totalFinancialAdditives;

  // Calculation for timeline extensions
  const totalDaysExtended = currentAdditives.reduce((acc, curr) => {
    if (curr.type === "prazo" || curr.type === "misto") {
      return acc + (curr.daysExecucao ?? curr.days ?? 0);
    }
    return acc;
  }, 0);

  const totalVigenciaDaysExtended = currentAdditives.reduce((acc, curr) => {
    if (curr.type === "prazo" || curr.type === "misto") {
      return acc + (curr.daysVigencia ?? curr.days ?? 0);
    }
    return acc;
  }, 0);

  // Helper to format days or months extended
  const formatTimeExtension = (originalTerm: string, addedMonths: number) => {
    if (!addedMonths) return originalTerm || "12 meses";
    return `${originalTerm || "12 meses"} (+${addedMonths} meses)`;
  };

  const addDaysToDate = (dateStr: string, daysToAdd: number) => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T12:00:00");
    if (isNaN(date.getTime())) return dateStr;
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split("T")[0];
  };

  const addMonths = (dateStr: string, monthsStr: string, defaultMonths = 12): string => {
    const baseDate = dateStr ? new Date(dateStr + "T12:00:00") : new Date();
    if (isNaN(baseDate.getTime())) return new Date().toISOString().split("T")[0];
    const match = (monthsStr || "").match(/\d+/);
    const parsedMonths = match ? parseInt(match[0], 10) : defaultMonths;
    baseDate.setMonth(baseDate.getMonth() + parsedMonths);
    return baseDate.toISOString().split("T")[0];
  };

  // Soma da vigência original com a data da ordem de início de obras, mais os meses aditivados
  const startVigenciaBaseDate = work.startOrderDate || work.signingDate || work.startDate || "";
  const baseVigenciaDateCalculated = addMonths(startVigenciaBaseDate, work.termDaysVigencia || "12 meses");
  const totalCalculatedVigencia = totalVigenciaDaysExtended > 0
    ? addMonths(baseVigenciaDateCalculated, totalVigenciaDaysExtended.toString())
    : (work.activeContractDate || baseVigenciaDateCalculated);

  // Soma da execução original com a data da ordem de início de obras, mais os meses aditivados de execução
  const startExecucaoBaseDate = work.startOrderDate || work.startDate || "";
  const baseExecucaoDateCalculated = addMonths(startExecucaoBaseDate, work.termDaysExecucao || "12 meses");
  const totalCalculatedExecucao = totalDaysExtended > 0
    ? addMonths(baseExecucaoDateCalculated, totalDaysExtended.toString())
    : (work.deadlineDate || baseExecucaoDateCalculated);

  // Find baseline dates excluding the editing additive (for accurate incremental calculation)
  const getBaselineDates = () => {
    const otherAdditives = currentAdditives.filter(a => a.id !== editingAdditiveId);

    // Sum of previous vigência extensions
    const prevVigenciaMonths = otherAdditives.reduce((acc, curr) => {
      if (curr.type === "prazo" || curr.type === "misto") {
        return acc + (curr.daysVigencia ?? curr.days ?? 0);
      }
      return acc;
    }, 0);

    // Sum of previous execução extensions
    const prevExecucaoMonths = otherAdditives.reduce((acc, curr) => {
      if (curr.type === "prazo" || curr.type === "misto") {
        return acc + (curr.daysExecucao ?? curr.days ?? 0);
      }
      return acc;
    }, 0);

    const baselineVigencia = prevVigenciaMonths > 0
      ? addMonths(baseVigenciaDateCalculated, prevVigenciaMonths.toString())
      : baseVigenciaDateCalculated;

    const baselineExecucao = prevExecucaoMonths > 0
      ? addMonths(baseExecucaoDateCalculated, prevExecucaoMonths.toString())
      : baseExecucaoDateCalculated;

    return {
      vigencia: baselineVigencia,
      execucao: baselineExecucao
    };
  };

  const baselineDates = getBaselineDates();

  // Warning calculations
  const calculateDaysPassed = (dateStr: string) => {
    const targetDate = new Date(dateStr + "T12:00:00");
    const today = new Date();
    const diffTime = today.getTime() - targetDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isDeadlinePast = work.activeContractDate 
    ? new Date().getTime() > new Date(work.activeContractDate + "T12:00:00").getTime()
    : false;
  const daysOverdue = work.activeContractDate ? calculateDaysPassed(work.activeContractDate) : 0;

  const subtractDaysFromDate = (dateStr: string, daysToSub: number) => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T12:00:00");
    if (isNaN(date.getTime())) return dateStr;
    date.setDate(date.getDate() - daysToSub);
    return date.toISOString().split("T")[0];
  };

  const subtractMonthsFromDate = (dateStr: string, monthsToSub: number) => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T12:00:00");
    if (isNaN(date.getTime())) return dateStr;
    date.setMonth(date.getMonth() - monthsToSub);
    return date.toISOString().split("T")[0];
  };

  const handleEditAdditiveClick = (add: ContractAdditive) => {
    setEditingAdditiveId(add.id);
    setAddNo(add.number);
    setAddType(add.type);
    setAddValue(add.value ? add.value.toString() : "");
    setAddDaysVigencia(add.daysVigencia ? add.daysVigencia.toString() : "");
    setAddDaysExecucao(add.daysExecucao ? add.daysExecucao.toString() : "");
    setAddNewVigenciaDate(add.newVigenciaDate || "");
    setAddNewExecucaoDate(add.newExecucaoDate || "");
    setAddDesc(add.description || "");
    setAddDate(add.signatureDate || "");
    setAddPublicationDateJom(add.publicationDateJom || "");
    setShowAddAdditive(true);
    document.getElementById("detail-aditivos-tab")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCancelEditAdditive = () => {
    setAddNo("");
    setAddValue("");
    setAddDays("");
    setAddDaysVigencia("");
    setAddDaysExecucao("");
    setAddNewVigenciaDate("");
    setAddNewExecucaoDate("");
    setAddDesc("");
    setAddDate("");
    setAddPublicationDateJom("");
    setEditingAdditiveId(null);
    setShowAddAdditive(false);
  };

  // Action: Add / Edit additive
  const handleCreateAdditive = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdditiveError("");

    if (!addNo.trim()) return setAdditiveError("Preencha o número do termo aditivo.");
    if (!addDate) return setAdditiveError("Selecione a data de assinatura.");

    const valNum = Number(addValue);
    if ((addType === "financeiro" || addType === "misto") && (isNaN(valNum) || valNum <= 0)) {
      return setAdditiveError("Insira um valor financeiro válido maior que zero.");
    }

    const daysVigNum = parseInt(addDaysVigencia, 10) || 0;
    const daysExecNum = parseInt(addDaysExecucao, 10) || 0;

    if (addType === "prazo" || addType === "misto") {
      if (daysVigNum < 0) {
        return setAdditiveError("Insira uma quantidade de meses válidos para prorrogação de Vigência.");
      }
      if (daysExecNum < 0) {
        return setAdditiveError("Insira uma quantidade de meses válidos para prorrogação de Execução.");
      }
      if (daysVigNum === 0 && daysExecNum === 0) {
        return setAdditiveError("Insira pelo menos 1 mês de prorrogação para Vigência ou Execução.");
      }
    }

    setIsSavingAdditive(true);
    try {
      const additiveData: ContractAdditive = {
        id: editingAdditiveId || `add-${Date.now()}`,
        number: addNo.trim(),
        type: addType,
        value: addType !== "prazo" ? valNum : undefined,
        days: addType !== "financeiro" ? (daysExecNum || daysVigNum || undefined) : undefined,
        daysVigencia: addType !== "financeiro" ? daysVigNum : undefined,
        daysExecucao: addType !== "financeiro" ? daysExecNum : undefined,
        newVigenciaDate: (addType !== "financeiro" && addNewVigenciaDate) ? addNewVigenciaDate : undefined,
        newExecucaoDate: (addType !== "financeiro" && addNewExecucaoDate) ? addNewExecucaoDate : undefined,
        description: addDesc.trim(),
        signatureDate: addDate,
        publicationDateJom: addPublicationDateJom || undefined
      };

      let updatedAdditives: ContractAdditive[];
      if (editingAdditiveId) {
        updatedAdditives = currentAdditives.map(a => a.id === editingAdditiveId ? additiveData : a);
      } else {
        updatedAdditives = [...currentAdditives, additiveData];
      }

      // Recompute total active dates accurately based on all current additives
      const totalVigExtended = updatedAdditives.reduce((acc, curr) => {
        if (curr.type === "prazo" || curr.type === "misto") {
          return acc + (curr.daysVigencia ?? curr.days ?? 0);
        }
        return acc;
      }, 0);

      const totalExecExtended = updatedAdditives.reduce((acc, curr) => {
        if (curr.type === "prazo" || curr.type === "misto") {
          return acc + (curr.daysExecucao ?? curr.days ?? 0);
        }
        return acc;
      }, 0);

      const updatedActiveContractDate = totalVigExtended > 0
        ? addMonths(baseVigenciaDateCalculated, totalVigExtended.toString())
        : baseVigenciaDateCalculated;

      const updatedDeadline = totalExecExtended > 0
        ? addMonths(baseExecucaoDateCalculated, totalExecExtended.toString())
        : baseExecucaoDateCalculated;

      await onUpdateWork({
        ...work,
        deadlineDate: updatedDeadline,
        activeContractDate: updatedActiveContractDate,
        additives: updatedAdditives
      });

      // Clear input fields
      setAddNo("");
      setAddValue("");
      setAddDays("");
      setAddDaysVigencia("");
      setAddDaysExecucao("");
      setAddNewVigenciaDate("");
      setAddNewExecucaoDate("");
      setAddDesc("");
      setAddDate("");
      setAddPublicationDateJom("");
      setEditingAdditiveId(null);
      setShowAddAdditive(false);
    } catch (err) {
      console.error(err);
      setAdditiveError(editingAdditiveId ? "Erro ao salvar alterações do aditivo." : "Erro ao registrar aditivo virtualmente.");
    } finally {
      setIsSavingAdditive(false);
    }
  };

  // Action: Delete an additive
  const handleDeleteAdditive = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este termo aditivo?")) return;

    try {
      const updatedAdditives = currentAdditives.filter((a) => a.id !== id);

      const totalVigExtended = updatedAdditives.reduce((acc, curr) => {
        if (curr.type === "prazo" || curr.type === "misto") {
          return acc + (curr.daysVigencia ?? curr.days ?? 0);
        }
        return acc;
      }, 0);

      const totalExecExtended = updatedAdditives.reduce((acc, curr) => {
        if (curr.type === "prazo" || curr.type === "misto") {
          return acc + (curr.daysExecucao ?? curr.days ?? 0);
        }
        return acc;
      }, 0);

      const updatedActiveContractDate = totalVigExtended > 0
        ? addMonths(baseVigenciaDateCalculated, totalVigExtended.toString())
        : baseVigenciaDateCalculated;

      const updatedDeadline = totalExecExtended > 0
        ? addMonths(baseExecucaoDateCalculated, totalExecExtended.toString())
        : baseExecucaoDateCalculated;

      await onUpdateWork({
        ...work,
        deadlineDate: updatedDeadline,
        activeContractDate: updatedActiveContractDate,
        additives: updatedAdditives
      });
    } catch (err) {
      console.error(err);
      alert("Erro ao remover aditivo.");
    }
  };

  // Simulated export Excel / CSV
  const handleExportCSV = () => {
    let headers = [
      "Ficha de Obra",
      "Contrato",
      "Valor Contratual Inicial",
      "Valor Contratual Atualizado",
      "Empresa Executora",
      "Termos Aditivos Registrados",
      "Progresso Fisico Atual",
      "Status de Fiscalizacao"
    ];
    let row = [
      `"${work.name}"`,
      `"${work.contractNumber}"`,
      `"R$ ${work.biddedValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}"`,
      `"R$ ${updatedValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}"`,
      `"${work.contractorName}"`,
      `"${currentAdditives.length}"`,
      `"${work.progress}%"`,
      `"${getStatusLabel(work.status)}"`
    ];
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(";") + "\n" 
      + row.join(";");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Contrato_${work.contractNumber.replace("/", "_")}_Ficha_Geral.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simulated Download PDF
  const handleDownloadPDF = () => {
    alert(
      `Relatório Executivo PDF Gerado com Sucesso!\n` +
      `Contrato: ${work.contractNumber}\n` +
      `Obra: ${work.name}\n` +
      `Avanço: ${work.progress}%\n` +
      `Valor Atualizado: R$ ${updatedValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
      `Documento autenticado sob chancela de supervisão.`
    );
  };

  // Interactive mock file upload files
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const newFile = {
        id: `f-${Date.now()}`,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        date: new Date().toISOString().split("T")[0],
        uploadedBy: activeUser.name
      };
      setMockFiles([newFile, ...mockFiles]);
    }
  };

  const handleAddMockFileText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dummyFileText.trim()) return;
    const newFile = {
      id: `f-${Date.now()}`,
      name: dummyFileText.trim().endsWith(".pdf") ? dummyFileText.trim() : `${dummyFileText.trim()}.pdf`,
      size: "1.2 MB",
      date: new Date().toISOString().split("T")[0],
      uploadedBy: activeUser.name
    };
    setMockFiles([newFile, ...mockFiles]);
    setDummyFileText("");
  };

  // Building the unified chronological list of events for the "Resumo Geral Cronológico da Obra"
  const timelineEvents: {
    id: string;
    date: string;
    type: "signing" | "jom" | "start_order" | "physical_start" | "additive" | "log";
    title: string;
    description?: string;
    data?: any;
  }[] = [];

  if (work.signingDate) {
    timelineEvents.push({
      id: "signing",
      date: work.signingDate,
      type: "signing",
      title: "Assinatura do Contrato de Obra",
    });
  }
  if (work.publicationDateJom) {
    timelineEvents.push({
      id: "jom",
      date: work.publicationDateJom,
      type: "jom",
      title: "Publicação no Diário Oficial JOM",
    });
  }
  if (work.startOrderDate) {
    timelineEvents.push({
      id: "start_order",
      date: work.startOrderDate,
      type: "start_order",
      title: "Disparo da Ordem de Início (O.S.)",
    });
  }
  if (work.physicalStartDate) {
    timelineEvents.push({
      id: "physical_start",
      date: work.physicalStartDate,
      type: "physical_start",
      title: "Mobilização Física e Início de Serviços e Campo",
    });
  }

  currentAdditives.forEach((add) => {
    timelineEvents.push({
      id: `add-${add.id}`,
      date: add.signatureDate,
      type: "additive",
      title: `Termo Aditivo Homologado (${add.number})`,
      description: add.description,
      data: add,
    });
  });

  workLogs.forEach((log) => {
    const logDateOnly = log.timestamp.split("T")[0];
    timelineEvents.push({
      id: `log-${log.id}`,
      date: logDateOnly,
      type: "log",
      title: "Lançamento de Atividade Semanal",
      description: log.notes,
      data: log,
    });
  });

  // Sort ascending: oldest to newest
  timelineEvents.sort((a, b) => {
    const timeA = new Date(a.date + "T12:00:00").getTime();
    const timeB = new Date(b.date + "T12:00:00").getTime();
    return timeA - timeB;
  });

  return (
    <div className="space-y-6 animate-fade-in" id="work-detail-page">
      {/* 1. Header Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 md:gap-4">
          {/* Back button */}
          <button
            onClick={onBack}
            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition cursor-pointer shadow-2xs mt-1"
            title="Voltar para a Grade"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase font-mono bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md font-bold">
                Contrato {work.contractNumber}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyle.bg} ${statusStyle.text}`}>
                {getStatusLabel(work.status)}
              </span>

              {isDeadlinePast && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 rounded-full text-[10px] font-bold text-rose-700 animate-pulse uppercase">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  PRAZO: VERIFICAR SITUAÇÃO DO ADITIVO (PRAZO ESGOTADO HÁ {daysOverdue} DIAS)
                </span>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight uppercase font-sans">
              {work.name}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Empresa Executora: <strong className="text-slate-800">{work.contractorName}</strong>
            </p>
          </div>
        </div>


      </div>

      {/* 2. Navigation Tab Menu */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab("ficha")}
          className={`px-4.5 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === "ficha"
              ? "border-amber-500 text-slate-900 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Ficha Técnica Geral
        </button>

        <button
          onClick={() => setActiveTab("aditivos")}
          className={`px-4.5 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "aditivos"
              ? "border-amber-500 text-slate-900 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Termos Aditivos & Timeline</span>
          <span className="text-[10px] px-1.5 py-px bg-slate-100 rounded text-slate-600 font-mono font-bold">
            {currentAdditives.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("lancamentos")}
          className={`px-4.5 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "lancamentos"
              ? "border-amber-500 text-slate-900 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Lançamentos Semanais</span>
          <span className="text-[10px] px-1.5 py-px bg-slate-100 rounded text-slate-600 font-mono font-bold">
            {workLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("revisoes")}
          className={`px-4.5 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === "revisoes"
              ? "border-amber-500 text-slate-900 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Histórico de Revisões
        </button>
      </div>

      {/* 3. Render and Display Active Tab Contents */}
      {activeTab === "ficha" && (
        <div className="space-y-6" id="detail-ficha-technical-tab">
          {/* Top Cards row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Progresso Físico Atual */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between min-h-[120px]">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Progresso Físico Atual
                </span>
                <p className="text-3xl font-black text-slate-900 font-sans tracking-tight mt-1.5 leading-none">
                  {work.progress}%
                </p>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden block border border-slate-200 mt-4.5">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full"
                  style={{ width: `${Math.min(work.progress, 100)}%` }}
                />
              </div>
            </div>

            {/* Card 2: Valor Contratual Atualizado */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between min-h-[120px]">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Valor Contratual Atualizado
                </span>
                <p className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono mt-2 leading-none">
                  {formatCurrency(updatedValue)}
                </p>
              </div>
              <div className="text-[11px] text-slate-450 font-semibold mt-4 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 flex justify-between">
                <span>Original licitado:</span>
                <strong className="text-slate-600 font-mono">{formatCurrency(originalValue)}</strong>
              </div>
            </div>

            {/* Card 3: Vigência Total */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between min-h-[120px]">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Vigência Total
                </span>
                <p className="text-xl font-bold text-slate-900 tracking-tight mt-1">
                  {formatTimeExtension(work.termDaysVigencia || "12 meses", totalVigenciaDaysExtended)}
                </p>
                <div className="text-[10px] text-slate-450 font-mono font-bold mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span>Prazo Vigente:</span>
                  <span className="text-amber-600 font-semibold">{formatDate(totalCalculatedVigencia)}</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-450 font-semibold mt-4.5 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 flex justify-between">
                <span>Ordem de Início:</span>
                <strong className="text-slate-600 font-mono">{formatDate(work.startOrderDate)}</strong>
              </div>
            </div>

            {/* Card 4: Execução Total */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between min-h-[120px]">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Execução Total
                </span>
                <p className="text-xl font-bold text-slate-900 tracking-tight mt-1">
                  {formatTimeExtension(work.termDaysExecucao || "12 meses", totalDaysExtended)}
                </p>
                <div className="text-[10px] text-slate-450 font-mono font-bold mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span>Prazo Vigente:</span>
                  <span className="text-amber-600 font-semibold">{formatDate(totalCalculatedExecucao)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dados do Expediente de Engenharia Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-slate-700" />
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  DADOS DA OBRA
                </h3>
              </div>
              <button
                onClick={() => onEditClick(work)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-amber-700 border border-amber-200 hover:border-amber-300 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Editar Contrato</span>
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-xs text-slate-600">
              <div className="space-y-4">
                <div className="flex justify-between md:grid md:grid-cols-3 border-b border-slate-100 pb-2.5">
                  <span className="text-slate-450 font-bold col-span-1">Processo Administrativo Nº:</span>
                  <span className="text-slate-800 font-bold col-span-2 text-right md:text-left">
                    {work.adminProcess || "Não informado"}
                  </span>
                </div>
                <div className="flex justify-between md:grid md:grid-cols-3 border-b border-slate-100 pb-2.5">
                  <span className="text-slate-450 font-bold col-span-1">Empresa Vencedora:</span>
                  <span className="text-slate-800 font-bold col-span-2 text-right md:text-left">
                    {work.contractorName || "Não informada"}
                  </span>
                </div>
                <div className="flex justify-between md:grid md:grid-cols-3 border-b border-slate-100 pb-2.5">
                  <span className="text-slate-450 font-bold col-span-1">Data de Assinatura:</span>
                  <span className="text-slate-800 font-bold font-mono col-span-2 text-right md:text-left">
                    {formatDate(work.signingDate)}
                  </span>
                </div>
                <div className="flex justify-between md:grid md:grid-cols-3 border-b border-slate-100 pb-2.5">
                  <span className="text-slate-450 font-bold col-span-1">Ordem de Início de Obras:</span>
                  <span className="text-slate-800 font-bold font-mono col-span-2 text-right md:text-left">
                    {formatDate(work.startOrderDate)}
                  </span>
                </div>
                <div className="flex justify-between md:grid md:grid-cols-3 border-b border-slate-100 pb-2.5">
                  <span className="text-slate-450 font-bold col-span-1">DATA DE INÍCIO FÍSICO:</span>
                  <span className="text-slate-800 font-bold font-mono col-span-2 text-right md:text-left">
                    {formatDate(work.physicalStartDate)}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between md:grid md:grid-cols-3 border-b border-slate-100 pb-2.5">
                  <span className="text-slate-450 font-bold col-span-1">Contrato Nº:</span>
                  <span className="text-slate-800 font-bold col-span-2 text-right md:text-left">
                    {work.contractNumber || "Não informado"}
                  </span>
                </div>
                <div className="flex justify-between md:grid md:grid-cols-3 border-b border-slate-100 pb-2.5">
                  <span className="text-slate-450 font-bold col-span-1">Concorrência Pública:</span>
                  <span className="text-slate-800 font-bold col-span-2 text-right md:text-left">
                    {work.biddingNumber || "Não Informado"}
                  </span>
                </div>
                <div className="flex justify-between md:grid md:grid-cols-3 border-b border-slate-100 pb-2.5">
                  <span className="text-slate-450 font-bold col-span-1">Data da Publicação no JOM:</span>
                  <span className="text-slate-800 font-bold font-mono col-span-2 text-right md:text-left">
                    {formatDate(work.publicationDateJom)}
                  </span>
                </div>
                <div className="flex justify-between md:grid md:grid-cols-3 border-b border-slate-100 pb-2.5">
                  <span className="text-slate-450 font-bold col-span-1">Prazo de Execução Atualizado:</span>
                  <span className="text-slate-800 font-bold col-span-2 text-right md:text-left flex items-center gap-1.5 flex-wrap md:justify-start justify-end">
                    <span>{formatTimeExtension(work.termDaysExecucao || "12 meses", totalDaysExtended)}</span>
                    <span className="text-slate-500 font-mono">({formatDate(totalCalculatedExecucao)})</span>
                  </span>
                </div>
                <div className="flex justify-between md:grid md:grid-cols-3 border-b border-slate-100 pb-2.5">
                  <span className="text-slate-450 font-bold col-span-1">Prazo de Vigência do Contrato:</span>
                  <span className="text-slate-800 font-bold col-span-2 text-right md:text-left flex items-center gap-1.5 flex-wrap md:justify-start justify-end">
                    <span>{formatTimeExtension(work.termDaysVigencia || "12 meses", totalVigenciaDaysExtended)}</span>
                    <span className="text-slate-500 font-mono">({formatDate(totalCalculatedVigencia)})</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "revisoes" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest pb-1.5 border-b border-slate-100">
                Histórico de Revisões
              </h3>
              
              <div className="relative pl-5 border-l-2 border-slate-150 space-y-6 text-xs text-slate-500 py-1">
                {timelineEvents.map((evt) => {
                  if (evt.type === "log") {
                    const log = evt.data;
                    const parsed = parseWeeklyReport(log.notes);
                    const isExpanded = !!expandedLogIds[log.id];

                    return (
                      <div key={evt.id} className="relative bg-slate-50/50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs hover:border-slate-300 transition shadow-3xs">
                        <span className="absolute -left-[27px] top-4.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-white" />
                        
                        <div className="flex justify-between items-start gap-2">
                          <div className="cursor-pointer flex-grow" onClick={() => {
                            setExpandedLogIds(prev => ({ ...prev, [log.id]: !prev[log.id] }));
                          }}>
                            <p className="font-extrabold text-amber-600 flex flex-wrap items-center gap-1.5">
                              <span>Lançamento Semanal de Atividade</span>
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-mono px-1.5 py-0.5 rounded font-black">
                                {log.newProgress}% avanço
                              </span>
                            </p>
                            <p className="font-mono text-[10px] text-slate-400 mt-0.5">
                              Período: <span className="font-bold text-slate-600">{parsed.period}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingLog(log);
                                setIsActivityModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-amber-600 bg-white border border-slate-200 hover:border-amber-200 rounded-md transition cursor-pointer"
                              title="Editar Lançamento"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={onGenerateReport}
                              className="p-1 text-slate-400 hover:text-amber-600 bg-white border border-slate-200 hover:border-amber-200 rounded-md transition cursor-pointer"
                              title="Exportar PDF do boletim"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            {onDeleteLog && (
                              <button
                                onClick={() => {
                                  if (confirm("Deseja realmente excluir este relatório semanal de atividade?")) {
                                    onDeleteLog(log.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 hover:border-rose-200 rounded-md transition cursor-pointer"
                                title="Excluir Relatório"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setExpandedLogIds(prev => ({ ...prev, [log.id]: !prev[log.id] }));
                              }}
                              className="p-1 text-slate-400 hover:text-slate-800 bg-white border border-slate-200 rounded-md transition cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible expanded detail */}
                        {isExpanded && (
                          <div className="pt-2 border-t border-slate-200/60 mt-2 space-y-2.5 animate-fade-in text-[11px] text-slate-600">
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              <div>Responsável: <span className="text-slate-700 font-extrabold">{log.userName}</span></div>
                              <div>Função: <span className="text-slate-700 font-extrabold">{log.userRole}</span></div>
                            </div>
                            
                            {/* Standard report fields */}
                            {parsed.isStandardReport ? (
                              <div className="space-y-2 bg-white p-2.5 rounded-lg border border-slate-100">
                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                  <div>Aditivo: <span className="font-semibold text-slate-800">{parsed.sitacaoAditivo}</span></div>
                                  <div>Infra de Dados: <span className="font-semibold text-slate-800">{parsed.infraDados}</span></div>
                                  <div>ENEL (Carga): <span className="font-semibold text-slate-800">{parsed.enelStatus}</span></div>
                                  <div>Subestação: <span className="font-semibold text-slate-800">{parsed.substationStatus}</span></div>
                                </div>
                                {parsed.relevantInfo && parsed.relevantInfo !== "N/A" && (
                                  <div className="text-[10px] pt-1.5 border-t border-slate-100">
                                    <span className="font-bold text-slate-550 block uppercase">Informação Relevante:</span>
                                    <p className="text-slate-700 mt-0.5 leading-relaxed">{parsed.relevantInfo}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="italic bg-white p-2.5 rounded-lg border border-slate-100 leading-relaxed">"{log.notes}"</p>
                            )}

                            {/* Bullet Lists */}
                            {parsed.weeklyActivities && parsed.weeklyActivities.length > 0 && (
                              <div>
                                <span className="font-bold text-slate-700 block mb-1">Atividades da Semana:</span>
                                <ul className="list-disc list-inside space-y-0.5 pl-1.5">
                                  {parsed.weeklyActivities.map((act, i) => (
                                    <li key={i}>{act}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {parsed.nextWeekActivities && parsed.nextWeekActivities.length > 0 && (
                              <div>
                                <span className="font-bold text-slate-700 block mb-1">Próxima Semana:</span>
                                <ul className="list-disc list-inside space-y-0.5 pl-1.5 text-slate-500">
                                  {parsed.nextWeekActivities.map((act, i) => (
                                    <li key={i}>{act}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {parsed.observations && parsed.observations.length > 0 && (
                              <div>
                                <span className="font-bold text-rose-700 block mb-1">Observações / Apontamentos:</span>
                                <ul className="list-disc list-inside space-y-0.5 pl-1.5 text-rose-600">
                                  {parsed.observations.map((act, i) => (
                                    <li key={i}>{act}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (evt.type === "additive") {
                    const add = evt.data;
                    return (
                      <div key={evt.id} className="relative">
                        <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-purple-550 border-2 border-white" />
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-bold text-purple-750">{evt.title}</p>
                            {evt.description && <p className="text-[11px] text-slate-600 mt-0.5">{evt.description}</p>}
                            <p className="font-mono text-[10px] text-slate-400 mt-1">Assinado: {formatDate(evt.date)}</p>
                          </div>
                          <div className="flex gap-1.5 self-start shrink-0">
                            <button
                              onClick={() => handleEditAdditiveClick(add)}
                              className="p-1.5 bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-600 border border-slate-200 rounded hover:border-amber-200 transition cursor-pointer"
                              title="Editar Aditivo"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteAdditive(add.id)}
                              className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 rounded hover:border-rose-200 transition cursor-pointer"
                              title="Excluir Aditivo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  let dotColor = "bg-slate-350";
                  if (evt.type === "start_order") dotColor = "bg-amber-550";
                  if (evt.type === "physical_start") dotColor = "bg-teal-555";

                  return (
                    <div key={evt.id} className="relative">
                      <span className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full ${dotColor} border-2 border-white`} />
                      <p className="font-bold text-slate-700">{evt.title}</p>
                      <p className="font-mono text-[10px] text-slate-400 mt-0.5">{formatDate(evt.date)}</p>
                    </div>
                  );
                })}

                <div className="relative">
                  <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-emerald-550 border-2 border-white" />
                  <p className="font-bold text-slate-900">Prazo Estimado de Liberação / Conclusão</p>
                  <p className="text-slate-455 font-semibold font-mono text-[10px] mt-0.5">
                    Previsão final recalibrada: {formatDate(work.deadlineDate)}
                  </p>
                </div>
              </div>
          </div>
      )}

      {activeTab === "aditivos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start" id="detail-aditivos-tab">
          {/* Aditamentos List Timeline (takes 2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">
                    Cronologia de Adições & Marcos Técnicos
                  </h3>
                </div>
                
                {/* Image upload for chronology */}
                <div className="border border-slate-300 border-dashed rounded-lg p-3 w-64 text-center cursor-pointer hover:bg-slate-50 transition" onClick={() => document.getElementById('timeline-image-input')?.click()}>
                  <input id="timeline-image-input" type="file" accept="image/*" className="hidden" onChange={handleTimelineImageChange} />
                  {work.timelineImage ? (
                    <img src={work.timelineImage} alt="Cronograma da Obra" className="max-h-24 mx-auto" />
                  ) : (
                    <div className="text-slate-400 text-xs">
                      <ImageIcon className="mx-auto mb-1 h-5 w-5" />
                      Clique para adicionar Imagem da Cronologia
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => setShowAddAdditive(!showAddAdditive)}
                className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-2xs cursor-pointer mb-6"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Aditivo</span>
              </button>

            {/* List */}
            {currentAdditives.length === 0 ? (
              <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-8 text-center text-slate-400 space-y-2">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-slate-700">Nenhum termo aditivo lançado</h4>
                <p className="text-xs text-slate-455">
                  Este contrato de obra opera sob os parâmetros originais sem aditivos secundários de prazo ou valor.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentAdditives.map((add, index) => {
                  const cleanedNumber = add.number ? add.number.replace(/Março\s*\/\s*/gi, "").replace(/Março\s*/gi, "") : "";
                  const cleanedDescription = add.description ? add.description.replace(/Março\s*\/\s*/gi, "").replace(/Março\s*/gi, "") : "";
                  return (
                    <div
                      key={add.id}
                      className="bg-white border border-slate-200 rounded-xl p-4.5 flex gap-4 items-start shadow-2xs relative group hover:border-amber-300 transition"
                    >
                      <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl font-bold text-xs uppercase shadow-2xs">
                        #{index + 1}
                      </div>
                      
                      <div className="flex-grow space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{cleanedNumber}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase uppercase-wide tracking-wider ${
                            add.type === "financeiro" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                              : add.type === "prazo"
                                ? "bg-blue-50 text-blue-700 border border-blue-100"
                                : "bg-purple-50 text-purple-700 border border-purple-100"
                          }`}>
                            Aditivo de {add.type === "financeiro" ? "Valor" : add.type === "prazo" ? "Prazo" : "Vigência Misto"}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-2">
                          {cleanedDescription}
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="flex flex-col">
                            <span className="text-slate-450 font-bold uppercase">Valor Aditivado</span>
                            <span className="text-emerald-700 font-extrabold">
                              {add.value !== undefined && add.value !== null ? formatCurrency(add.value) : "R$ 0,00"}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-slate-450 font-bold uppercase">Prazo Aditivado</span>
                            <span className="text-blue-700 font-extrabold">
                              {add.days ? `${add.days} meses` : "N/A"}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-slate-450 font-bold uppercase">Data de Execução</span>
                            <span className="text-slate-700 font-mono font-bold">
                              {add.newExecucaoDate
                                ? formatDate(add.newExecucaoDate)
                                : (add.newVigenciaDate ? formatDate(add.newVigenciaDate) : "N/A")}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-slate-450 font-bold uppercase">Data de Vigência Contratual</span>
                            <span className="text-slate-700 font-mono font-bold">
                              {add.newVigenciaDate ? formatDate(add.newVigenciaDate) : "N/A"}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider">Data de Publicação</span>
                            <span className="block text-xs font-mono font-bold text-slate-700">
                             {add.publicationDate ? formatDate(add.publicationDate) : "N/A"}
                            </span>
                        </div>
                      </div>

                      <div className="flex gap-1.5 self-start md:opacity-0 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={() => handleEditAdditiveClick(add)}
                          className="p-2 bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-600 border border-slate-200 rounded-lg hover:border-amber-200 transition cursor-pointer"
                          title="Editar Aditivo"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAdditive(add.id)}
                          className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 rounded-lg hover:border-rose-200 transition cursor-pointer"
                          title="Excluir Aditivo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>


            {(showAddAdditive || currentAdditives.length === 0) && (
              <form
                onSubmit={handleCreateAdditive}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4"
              >
                <div>
                  <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider block">
                    {editingAdditiveId ? "Editar Termo Aditivo" : "Inserir Termo Aditivo"}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 block">
                    {editingAdditiveId ? "Atualize as informações do aditivo lançado" : "Atualiza cronograma e montante financeiro"}
                  </p>
                </div>

                {additiveError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                    {additiveError}
                  </div>
                )}

                {/* Number */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Número do Aditivo / Identificador
                  </label>
                  <input
                    type="text"
                    required
                    value={addNo}
                    onChange={(e) => setAddNo(e.target.value)}
                    placeholder="Ex: Aditivo 01/2026"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-1 focus:focus:ring-amber-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:font-mono transition shadow-2xs"
                  />
                </div>

                {/* Type */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Tipo de Aditamento
                  </label>
                  <select
                    value={addType}
                    onChange={(e) => setAddType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-1 focus:focus:ring-amber-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none shadow-2xs cursor-pointer"
                  >
                    <option value="financeiro">Financeiro (Acréscimo R$)</option>
                    <option value="prazo">Prazo (Meses)</option>
                    <option value="misto">Misto (Valor R$ + Prazo)</option>
                  </select>
                </div>

                {/* Value - conditional */}
                {(addType === "financeiro" || addType === "misto") && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Valor Financeiro do Acréscimo (R$)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={addValue}
                      onChange={(e) => setAddValue(e.target.value)}
                      placeholder="Ex: 154000.00"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-1 focus:focus:ring-amber-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:font-mono transition shadow-2xs"
                    />
                  </div>
                )}

                {/* Days and Dates - conditional */}
                {(addType === "prazo" || addType === "misto") && (
                  <div className="space-y-4 border border-amber-200/50 bg-amber-50/15 p-3.5 rounded-xl">
                    <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest block border-b border-amber-200/30 pb-1 mb-2">
                      Prorrogações de Prazos
                    </span>
                    
                    {/* 1. Vigência Contratual Group */}
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                          Prorrogação de Vigência (Meses)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={addDaysVigencia}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAddDaysVigencia(val);
                            const d = parseInt(val, 10);
                            if (!isNaN(d) && d >= 0) {
                              setAddNewVigenciaDate(addMonths(baselineDates.vigencia, d.toString()));
                            } else {
                              setAddNewVigenciaDate("");
                            }
                          }}
                          placeholder="Ex: 3"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-1 focus:focus:ring-amber-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:font-mono transition shadow-2xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Nova Data de Vigência
                        </label>
                        <input
                          type="date"
                          value={addNewVigenciaDate}
                          onChange={(e) => setAddNewVigenciaDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-1 focus:focus:ring-amber-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none transition shadow-2xs cursor-pointer"
                        />
                        <p className="text-[9px] text-amber-700 font-medium italic block">
                          Original / Anterior: {formatDate(baselineDates.vigencia)}
                        </p>
                      </div>
                    </div>

                    {/* 2. Prazo de Execução Group */}
                    <div className="space-y-2 border-t border-slate-200/50 pt-2.5 mt-2.5">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                          Prorrogação de Execução (Meses)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={addDaysExecucao}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAddDaysExecucao(val);
                            const d = parseInt(val, 10);
                            if (!isNaN(d) && d >= 0) {
                              setAddNewExecucaoDate(addMonths(baselineDates.execucao, d.toString()));
                            } else {
                              setAddNewExecucaoDate("");
                            }
                          }}
                          placeholder="Ex: 3"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-1 focus:focus:ring-amber-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:font-mono transition shadow-2xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Nova Data de Execução (Conclusão)
                        </label>
                        <input
                          type="date"
                          value={addNewExecucaoDate}
                          onChange={(e) => setAddNewExecucaoDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-1 focus:focus:ring-amber-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none transition shadow-2xs cursor-pointer"
                        />
                        <p className="text-[9px] text-amber-700 font-medium italic block">
                          Original / Anterior: {formatDate(baselineDates.execucao)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Signature Date */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Data de assinatura
                  </label>
                  <input
                    type="date"
                    required
                    value={addDate}
                    onChange={(e) => setAddDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-1 focus:focus:ring-amber-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none transition shadow-2xs cursor-pointer"
                  />
                </div>

                {/* Publication Date JOM */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Data de Publicação no JOM
                  </label>
                  <input
                    type="date"
                    value={addPublicationDateJom}
                    onChange={(e) => setAddPublicationDateJom(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-1 focus:focus:ring-amber-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none transition shadow-2xs cursor-pointer"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Descrição de Motivo / Notas Técnicas (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={addDesc}
                    onChange={(e) => setAddDesc(e.target.value)}
                    placeholder="Ex: Remanejamento de adutoras e serviços extraordinários de terraplenagem."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-1 focus:focus:ring-amber-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition shadow-2xs"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleCancelEditAdditive}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-[11px] transition cursor-pointer"
                  >
                    Ocultar / Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAdditive}
                    className="px-4.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>{editingAdditiveId ? "Salvar Alterações" : "Gravar Aditivo"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
      )}

      {activeTab === "lancamentos" && (
        <div className="animate-fade-in" id="detail-lancamentos-tab">
          {workLogs.length === 0 ? (
            <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-6 shadow-3xs">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-500">
                <Logs className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <h4 className="text-base font-black text-slate-900">Nenhum Lançamento Registrado</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                  Esta obra ainda não possui nenhum boletim de acompanhamento semanal registrado. Lance a primeira atividade para iniciar o histórico.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-xs px-6 py-3.5 rounded-2xl shadow-2xs hover:shadow-xs transition duration-200 flex items-center gap-2 mx-auto cursor-pointer"
                >
                  <PlusCircle className="w-4.5 h-4.5" />
                  <span>Lançar Atividade Semanal</span>
                </button>
              </div>

              <div className="border-t border-slate-100 pt-6 mt-4">
                <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5 font-semibold uppercase tracking-wider">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Os lançamentos registrados serão consolidados na aba Termos Aditivos & Timeline</span>
                </p>
              </div>
            </div>
          ) : (() => {
            const selectedLog = workLogs.find((log) => log.id === selectedLogId) || workLogs[0];
            const selectedParsed = parseWeeklyReport(selectedLog.notes);
            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Relatórios Semanais Sidebar */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-3xs">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-900 font-sans tracking-wide">
                      Relatórios Semanais
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsActivityModalOpen(true)}
                      className="px-3 py-1.5 border border-slate-900 hover:bg-slate-50 text-slate-900 text-xs font-bold rounded-full flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Novo Relatório</span>
                    </button>
                  </div>

                  <div className="border-b border-slate-100 my-3" />

                  {/* List of weeks */}
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {workLogs.map((log) => {
                      const p = parseWeeklyReport(log.notes);
                      const isSelected = selectedLog && selectedLog.id === log.id;
                      return (
                        <button
                          key={log.id}
                          type="button"
                          onClick={() => setSelectedLogId(log.id)}
                          className={`w-full text-left rounded-2xl p-4 transition flex justify-between items-center cursor-pointer border ${
                            isSelected
                              ? "bg-[#111c30] text-white shadow-sm border-transparent"
                              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                            <span className={`font-bold text-xs block ${isSelected ? "text-white" : "text-slate-900"}`}>
                              Acompanhamento Semanal
                            </span>
                            <span className={`text-[10px] block font-semibold truncate ${isSelected ? "text-slate-450" : "text-slate-400"}`}>
                              {p.period}
                            </span>
                          </div>
                          <div className={`font-black text-xs shrink-0 ${isSelected ? "text-sky-400" : "text-indigo-600"}`}>
                            {log.newProgress}%
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column: Selected Log Details */}
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6">
                  
                  {/* Header of detailed report */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="space-y-1">
                      <h3 className="text-base font-extrabold text-slate-900 font-sans">
                        Relatório Semanal de Campo
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Período de Medição: <span className="font-extrabold text-slate-700">{selectedParsed.period}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Menu Suspenso (Dropdown list of weeks) */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsWeekDropdownOpen(!isWeekDropdownOpen)}
                          className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-slate-300 rounded-xl transition duration-150 text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer shadow-3xs font-sans"
                        >
                          <span>Semanas Lançadas</span>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        
                        {isWeekDropdownOpen && (
                          <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-30 animate-fade-in max-h-60 overflow-y-auto">
                            {workLogs.map((log) => {
                              const p = parseWeeklyReport(log.notes);
                              return (
                                <button
                                  key={log.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedLogId(log.id);
                                    setIsWeekDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 transition flex justify-between items-center cursor-pointer ${
                                    selectedLog.id === log.id ? "bg-amber-50/50 text-amber-700 font-extrabold" : "text-slate-700 font-medium"
                                  }`}
                                >
                                  <div className="truncate mr-2">
                                    <span className="block text-[11px] font-bold text-slate-900">{p.period}</span>
                                    <span className="block text-[9px] text-slate-450 font-semibold">Avanço: {log.newProgress}%</span>
                                  </div>
                                  <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                                    selectedLog.id === log.id ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                                  }`}>
                                    {log.newProgress}%
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLog(selectedLog);
                          setIsActivityModalOpen(true);
                        }}
                        className="p-1.5 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-250 rounded-xl hover:border-slate-350 transition cursor-pointer text-[11px] font-extrabold flex items-center gap-1.5"
                        title="Editar Lançamento"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Editar Report</span>
                      </button>

                      <button
                        type="button"
                        onClick={onGenerateReport} 
                        className="p-1.5 px-3.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60 rounded-xl transition cursor-pointer text-[11px] font-black flex items-center gap-1.5"
                        title="Exportar PDF do boletim"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span>Exportar PDF da Semana</span>
                      </button>

                      {onDeleteLog && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Deseja realmente excluir este relatório semanal de atividade?")) {
                              onDeleteLog(selectedLog.id);
                              setSelectedLogId(null);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-rose-650 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition cursor-pointer shadow-3xs"
                          title="Excluir Relatório"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metadata and Author Info */}
                  <div className="text-[11px] text-slate-500 font-medium">
                    Registrado por: <span className="text-slate-700 font-bold">{selectedLog.userName}</span> ({selectedLog.userRole}) • {formatDate(selectedLog.timestamp.split("T")[0])}
                  </div>

                  {/* FOTO DE CAPA DO RELATÓRIO */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-sans">
                      Foto de Capa do Relatório
                    </span>
                    {selectedLog.coverImage ? (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 aspect-[2.35/1] max-h-64 shadow-3xs group/img">
                        <img
                          src={selectedLog.coverImage}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition duration-300 group-hover/img:scale-102"
                          alt="Foto Capa"
                        />
                      </div>
                    ) : (
                      <div className="border border-dashed border-slate-250 rounded-2xl p-6 text-center bg-slate-50/50 text-slate-450 text-xs font-semibold">
                        Nenhuma foto de capa cadastrada para esta semana.
                      </div>
                    )}
                  </div>

                  {/* Indicators Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4.5 bg-slate-50/80 border border-slate-100 rounded-2xl shadow-3xs">
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-[9.5px] text-slate-450 font-extrabold uppercase tracking-wider">Avanço Físico Real</span>
                      <span className="text-indigo-650 font-black text-sm">{selectedLog.newProgress}%</span>
                    </div>
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-[9.5px] text-slate-450 font-extrabold uppercase tracking-wider">Situação do Aditivo</span>
                      <span className="text-slate-800 font-extrabold text-sm">{selectedParsed.sitacaoAditivo}</span>
                    </div>
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-[9.5px] text-slate-450 font-extrabold uppercase tracking-wider">Rede ENEL (Média T.)</span>
                      <span className="text-slate-800 font-extrabold text-sm">{selectedParsed.enelStatus}</span>
                    </div>
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-[9.5px] text-slate-450 font-extrabold uppercase tracking-wider">Subestação Elétrica</span>
                      <span className="text-slate-800 font-extrabold text-sm">{selectedParsed.substationStatus}</span>
                    </div>
                  </div>

                  {/* Lists Section */}
                  <div className="space-y-5 pt-2">
                    {selectedParsed.isStandardReport ? (
                      <div className="space-y-5">
                        {selectedParsed.weeklyActivities && selectedParsed.weeklyActivities.length > 0 && (
                          <div className="space-y-2">
                            <span className="font-extrabold text-slate-800 block text-xs tracking-wider uppercase font-sans">
                              Atividades Desenvolvidas na Semana:
                            </span>
                            <ul className="space-y-1.5 pl-0.5 text-slate-700 leading-relaxed text-xs">
                              {selectedParsed.weeklyActivities.map((act, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                  <span>{act}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {selectedParsed.nextWeekActivities && selectedParsed.nextWeekActivities.length > 0 && (
                          <div className="space-y-2">
                            <span className="font-extrabold text-slate-800 block text-xs tracking-wide uppercase font-sans">
                              Atividades Programadas para Próxima Semana:
                            </span>
                            <ul className="space-y-1.5 pl-0.5 text-slate-600 leading-relaxed text-xs">
                              {selectedParsed.nextWeekActivities.map((act, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                  <span>{act}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {selectedParsed.observations && selectedParsed.observations.length > 0 && (
                          <div className="space-y-2">
                            <span className="font-extrabold text-rose-700 block text-xs tracking-wide uppercase font-sans">
                              Observações, Não Conformidades & Alertas de Fiscalização:
                            </span>
                            <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4">
                              <ul className="space-y-1.5 text-rose-800 leading-relaxed font-semibold text-xs pl-0.5">
                                {selectedParsed.observations.map((act, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                    <span>{act}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="font-extrabold text-slate-800 block text-xs tracking-wide uppercase font-sans">
                          Resumo / Notas de Campo:
                        </span>
                        <p className="text-slate-700 italic leading-relaxed text-xs">"{selectedLog.notes}"</p>
                      </div>
                    )}

                    {/* Image Gallery */}
                    {(selectedLog.coverImage || (selectedLog.progressImages && selectedLog.progressImages.length > 0)) && (
                      <div className="space-y-3 pt-2">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-sans">
                          Galeria de Fotos da Semana
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {selectedLog.coverImage && (
                            <div className="relative group/img rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video shadow-3xs">
                              <img src={selectedLog.coverImage} referrerPolicy="no-referrer" className="w-full h-full object-cover transition duration-200 group-hover/img:scale-105" alt="Foto Capa" />
                              <span className="absolute bottom-1.5 left-1.5 bg-slate-900/85 text-white text-[8px] font-bold px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">Capa</span>
                            </div>
                          )}
                          {selectedLog.progressImages?.map((imgUrl, idx) => (
                            <div key={idx} className="relative group/img rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video shadow-3xs">
                              <img src={imgUrl} referrerPolicy="no-referrer" className="w-full h-full object-cover transition duration-200 group-hover/img:scale-105" alt={`Foto Progresso ${idx + 1}`} />
                              <span className="absolute bottom-1.5 left-1.5 bg-slate-900/85 text-white text-[8px] font-bold px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">Foto {idx + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            );
          })()}
        </div>
      )}

      {activeTab === "drive" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start" id="detail-drive-tab">
          {/* List are mock attachment documents (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">
              Repositório Integrado de Documentos (Google Drive Nuvem)
            </h3>

            {/* Drag & drop upload target */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`w-full border-2 border-dashed rounded-2xl p-6.5 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2.5 ${
                dragActive
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-slate-250 bg-white hover:border-blue-400/80 hover:bg-slate-50/30"
              }`}
            >
              <FileUp className="w-9 h-9 text-blue-500" />
              <div>
                <p className="text-xs font-extrabold text-slate-800">
                  Arraste e solte o arquivo do contrato/diário de fotos aqui
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Extensões permitidas: PDF, XLS, DWG, JPG (Tamanho limite recomendado: 10MB)
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                <span>Arquivo</span>
                <span>Tamanho / Cadastro</span>
              </div>
              
              <div className="divide-y divide-slate-100">
                {mockFiles.map((file) => (
                  <div key={file.id} className="p-4.5 flex justify-between items-center hover:bg-slate-50/50 transition text-xs">
                    <div className="flex items-center gap-3">
                      <Paperclip className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="font-extrabold text-slate-900">{file.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Enviado por: {file.uploadedBy}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <span className="text-slate-500 font-mono text-right flex flex-col items-end">
                        <span className="font-bold text-slate-700">{file.size}</span>
                        <span className="text-[10px] text-slate-400 block">{file.date}</span>
                      </span>
                      <button
                        onClick={() => alert(`Iniciando download do arquivo virtual: ${file.name}`)}
                        className="p-1.5 bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 border border-slate-150 rounded"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick upload input (1 col) */}
          <div className="lg:col-span-1 space-y-4 sticky top-20">
            <form onSubmit={handleAddMockFileText} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Vincular Link / Documento
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Crie uma pasta de arquivos digitais vinculada a este contrato
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Nome do Documento / Título
                </label>
                <input
                  type="text"
                  required
                  value={dummyFileText}
                  onChange={(e) => setDummyFileText(e.target.value)}
                  placeholder="Ex: Diário_de_Obras_Ref_Junho.pdf"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-1 focus:focus:ring-amber-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition shadow-2xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-650 hover:bg-blue-600 text-white font-extrabold rounded-xl text-xs transition shadow-2xs"
              >
                Vincular PDF
              </button>
            </form>
          </div>
        </div>
      )}

      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => {
          setIsActivityModalOpen(false);
          setEditingLog(null);
        }}
        work={work}
        onSubmittingActivity={onLaunchMeasurement}
        onUpdatingActivity={onUpdateLog}
        activeUser={activeUser}
        existingLog={editingLog}
      />
    </div>
  );
}
