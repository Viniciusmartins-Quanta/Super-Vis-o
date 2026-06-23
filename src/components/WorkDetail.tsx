import React, { useState } from "react";
import { Obra, UpdateLog, ContractAdditive, UserProfile } from "../types";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "../utils";
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
  onDeleteLog?: (logId: string) => Promise<void>;
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
  onDeleteLog
}: WorkDetailProps) {
  const [activeTab, setActiveTab] = useState<
    "ficha" | "aditivos" | "lancamentos" | "drive" | "revisoes" | "logs"
  >("ficha");

  // Local state for additives form
  const [showAddAdditive, setShowAddAdditive] = useState(false);
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
  const [isSavingAdditive, setIsSavingAdditive] = useState(false);
  const [additiveError, setAdditiveError] = useState("");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editNotesText, setEditNotesText] = useState("");

  const handleTimelineImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateWork({ ...work, timelineImage: reader.result as string });
      };
      reader.readAsDataURL(file);
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
          lines.push(`Prazo Aditivado: <span style="font-weight: bold;">${add.days} dias</span>`);
        } else if (add.type === "prazo" || add.type === "misto") {
          lines.push(`Prazo Aditivado: <span style="font-weight: bold;">N/A</span>`);
        }
        
        if (add.newVigenciaDate) {
          lines.push(`Novo Prazo Contratual: <span style="font-weight: bold; color: #ea580c;">${formatDate(add.newVigenciaDate)}</span>`);
        }
        
        if (add.newExecucaoDate) {
          lines.push(`Novo Prazo de Execução Contratual: <span style="font-weight: bold; color: #ea580c;">${formatDate(add.newExecucaoDate)}</span>`);
        } else if (add.newVigenciaDate) {
          lines.push(`Novo Prazo de Execução Contratual: <span style="font-weight: bold; color: #ea580c;">${formatDate(add.newVigenciaDate)}</span>`);
        }

        const rowspan = lines.length;

        return lines.map((line, lineIdx) => {
          if (lineIdx === 0) {
            return `
              <tr>
                <td rowspan="${rowspan}" style="text-align: center; vertical-align: middle; font-weight: bold; text-transform: uppercase; width: 25%; font-family: Arial, sans-serif;">
                  ${orderWord}
                </td>
                <td style="font-family: Calibri, sans-serif; font-size: 9.2pt;">${line}</td>
              </tr>
            `;
          } else {
            return `
              <tr>
                <td style="font-family: Calibri, sans-serif; font-size: 9.2pt;">${line}</td>
              </tr>
            `;
          }
        }).join("");
      }).join("");
    } else {
      // Exactly pre-populated fallback additives matching example
      additivesTableRows = `
        <tr>
          <td rowspan="4" style="text-align: center; vertical-align: middle; font-weight: bold; text-transform: uppercase; width: 25%; font-family: Arial, sans-serif;">
            1º ADITIVO
          </td>
          <td style="font-family: Calibri, sans-serif; font-size: 9.2pt;">Data assinatura: <span style="font-weight: bold;">20/06/2024</span></td>
        </tr>
        <tr>
          <td style="font-family: Calibri, sans-serif; font-size: 9.2pt;">Data publicação JOM: <span style="font-weight: bold;">03/07/2024</span></td>
        </tr>
        <tr>
          <td style="font-family: Calibri, sans-serif; font-size: 9.2pt;">Prazo Aditivado: <span style="font-weight: bold;">10 (dez) meses</span></td>
        </tr>
        <tr>
          <td style="font-family: Calibri, sans-serif; font-size: 9.2pt;">Novo Prazo Contratual: <span style="font-weight: bold; color: #ea580c;">20/04/2025</span></td>
        </tr>

        <tr>
          <td rowspan="5" style="text-align: center; vertical-align: middle; font-weight: bold; text-transform: uppercase; font-family: Arial, sans-serif;">
            2º ADITIVO
          </td>
          <td style="font-family: Calibri, sans-serif; font-size: 9.2pt;">Data assinatura: <span style="font-weight: bold;">21/04/2025</span></td>
        </tr>
        <tr>
          <td style="font-family: Calibri, sans-serif; font-size: 9.2pt;">Data publicação JOM: <span style="font-weight: bold;">02/07/2025</span></td>
        </tr>
        <tr>
          <td style="font-family: Calibri, sans-serif; font-size: 9.2pt;">Prazo Aditivado: <span style="font-weight: bold;">10 (dez) meses</span></td>
        </tr>
        <tr>
          <td style="font-family: Calibri, sans-serif; font-size: 9.2pt;">Novo Prazo Contratual: <span style="font-weight: bold; color: #ea580c;">20/02/2026</span></td>
        </tr>
        <tr>
          <td style="font-family: Calibri, sans-serif; font-size: 9.2pt;">Novo Prazo de Execução Contratual: <span style="font-weight: bold; color: #ea580c;">20/02/2026</span></td>
        </tr>

        <tr>
          <td rowspan="5" style="text-align: center; vertical-align: middle; font-weight: bold; text-transform: uppercase; font-family: Arial, sans-serif;">
            3º ADITIVO
          </td>
          <td style="font-family: Calibri, sans-serif; font-size: 9.2pt;">Data assinatura: <span style="font-weight: bold;">20/02/2026</span></td>
        </tr>
        <tr>
          <td style="font-family: Calibri, sans-serif; font-size: 9.2pt;">Data publicação JOM: <span style="font-weight: bold;">21/05/2026</span></td>
        </tr>
        <tr>
          <td style="font-family: Calibri, sans-serif; font-size: 9.2pt;">Prazo Aditivado: <span style="font-weight: bold;">6 (seis) meses</span></td>
        </tr>
        <tr>
          <td style="font-family: Calibri, sans-serif; font-size: 9.2pt;">Novo Prazo Contratual: <span style="font-weight: bold; color: #ea580c;">21/08/2026</span></td>
        </tr>
        <tr>
          <td style="font-family: Calibri, sans-serif; font-size: 9.2pt;">Novo Prazo de Execução Contratual: <span style="font-weight: bold; color: #ea580c;">21/08/2026</span></td>
        </tr>
      `;
    }

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
        margin: 0;
      }
      body {
        margin: 0;
        padding: 20px 0;
        background-color: #cbd5e1;
        font-family: 'Inter', sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
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
          background-color: white;
          margin: 0;
          padding: 0;
        }
        .page {
          margin: 0;
          box-shadow: none;
          page-break-after: always;
          break-after: page;
        }
        .expandable-page {
          page-break-inside: auto;
        }
        .no-print {
          display: none;
        }
      }
      /* Custom line clamp helpers */
      .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
         -webkit-box-orient: vertical;  
        overflow: hidden;
      }
      .black-grid-table {
        border-collapse: collapse;
        width: 100%;
        border: 1.5px solid #000000;
        font-family: 'Calibri', 'Arial', sans-serif;
        font-size: 9.2pt;
        color: #000000;
        line-height: 1.4;
      }
      .black-grid-table td, .black-grid-table th {
        border: 1px solid #000000;
        padding: 2.6px 8px;
        color: #000000;
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

      <!-- PAGE FOOTER -->
      <div class="page-footer">1</div>
    </div>
  </div>


  <!-- PAGE 2: FICHA TÉCNICA CONTRATUAL (DETALHES DO CONTRATO) -->
  <div class="page watermark-page border border-slate-100">
    <div class="page-content">
      <div class="flex-grow my-4 flex flex-col justify-start">
        <!-- Contract Title banner with background orange, black Arial 11pt bold text -->
        <div style="background-color: #f97316; border: 0.3mm solid black; border-radius: 0px; padding: 12px; text-align: center; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
          <h2 style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: black; margin: 0; text-transform: uppercase; letter-spacing: 0.1px;">
            ${work.name}
          </h2>
        </div>
        
        <!-- Space for the cover photo of the week (using log.coverImage if loaded, else fallback blueprint design) -->
        <div class="border border-black h-[70mm] flex items-center justify-center relative overflow-hidden mb-3 bg-slate-50 shadow-2xs" style="border-width: 0.3mm;">
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
      
      <div class="page-footer">2</div>
    </div>
  </div>


  <!-- PAGE 3: CONTRATUAL TIMELINE & CHRONOLOGY CHRONOGRAM -->
  <div class="page watermark-page border border-slate-100">
    <div class="page-content">
      <div class="flex-grow my-4 flex flex-col justify-start">
        <div>
          <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest border-l-2 border-orange-500 pl-2">
            CRONOLOGIA DA OBRA
          </h3>
        </div>

        <!-- Place for User inserted Chronology -->
        ${work.timelineImage ? `
          <div class="mt-4">
            <img src="${work.timelineImage}" alt="Cronograma da Obra" class="max-w-full h-auto" />
          </div>
        ` : `
          <div class="mt-4 p-4 border-2 border-dashed border-slate-300 rounded-none text-slate-500 text-xs text-center">
            Inserir cronologia da obra aqui.
          </div>
        `}
      </div>
      
      <div class="page-footer">3</div>
    </div>
  </div>


  <!-- PAGE 4: ATIVIDADES DA SEMANA (MEDICAO SEMANAL) -->
  <div class="page watermark-page border border-slate-100">
    
    <div class="flex-grow my-4 flex flex-col justify-start">
      <table class="black-grid-table">
        <tbody>
          <tr>
            <td style="font-weight: bold; width: 42%;">% Físico executado - ${work.name}:</td>
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
            <td style="font-weight: bold; vertical-align: top;">Atividades da semana: ${parsed.period}</td>
            <td style="vertical-align: top; padding: 0 8px 8px 8px;">
              <ul style="list-style-type: none; margin: 0; padding: 0;">
                ${parsed.weeklyActivities.map(act => `
                  <li style="margin-top: 6px; padding-left: 12px; position: relative; font-family: 'Calibri', 'Arial', sans-serif; font-size: 9.2pt; font-weight: normal;">
                    <span style="position: absolute; left: 0; top: 0;">•</span>
                    ${act}
                  </li>
                `).join("") || `<li style="margin-top: 6px; font-style: italic; color: #777;">Nenhuma atividade descrita para a semana registrada.</li>`}
              </ul>
            </td>
          </tr>
          <tr>
            <td style="font-weight: bold; vertical-align: top;">Atividades da próxima semana: ${getNextWeekPeriod(parsed.period)}</td>
            <td style="vertical-align: top; padding: 0 8px 8px 8px;">
              <ul style="list-style-type: none; margin: 0; padding: 0;">
                ${parsed.nextWeekActivities.map(act => `
                  <li style="margin-top: 6px; padding-left: 12px; position: relative; font-family: 'Calibri', 'Arial', sans-serif; font-size: 9.2pt; font-weight: normal;">
                    <span style="position: absolute; left: 0; top: 0;">•</span>
                    ${act}
                  </li>
                `).join("") || `<li style="margin-top: 6px; font-style: italic; color: #777;">Nenhuma atividade programada de frentes futuras.</li>`}
              </ul>
            </td>
          </tr>
          <tr>
            <td style="font-weight: bold; vertical-align: top;">Observações e apontamentos importantes:</td>
            <td style="vertical-align: top; padding: 0 8px 8px 8px;">
              <ul style="list-style-type: none; margin: 0; padding: 0;">
                ${parsed.observations.map(obs => {
                  const cleaned = obs.trim();
                  if (cleaned.toLowerCase().startsWith("não conformidade") || cleaned.toLowerCase().startsWith("nao conformidade")) {
                    const content = cleaned.replace(/^não conformidade:?/i, "").replace(/^nao conformidade:?/i, "").trim();
                    return `
                      <li style="margin-top: 6px; font-family: 'Calibri', 'Arial', sans-serif; font-size: 9.2pt;">
                        <strong style="color: #000000; font-family: 'Arial', sans-serif; font-size: 9.2pt;">Não conformidade</strong><br/>
                        ${content}
                      </li>
                    `;
                  }
                  return `
                    <li style="margin-top: 6px; padding-left: 12px; position: relative; font-family: 'Calibri', 'Arial', sans-serif; font-size: 9.2pt; font-weight: normal;">
                      <span style="position: absolute; left: 0; top: 0;">•</span>
                      ${cleaned}
                    </li>
                  `;
                }).join("") || `<li style="margin-top: 6px; font-style: italic; color: #777;">Nenhum apontamento crítico de fiscalização registrado no período semanal.</li>`}
              </ul>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="flex justify-start items-center text-[8.5px] text-slate-500 font-bold select-none font-mono mb-1">
      <span>4</span>
    </div>
  </div>


  <!-- PAGE 5: REGISTRO FOTOGRÁFICO DE MARCOS (FOTOS DA OBRA) -->
  <div class="page watermark-page border border-slate-100">
    
    <div class="flex-grow my-5 flex flex-col justify-start">
      <div style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: black; margin-bottom: 4mm; text-transform: uppercase;">
        FOTOS DA SEMANA:
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
    </div>
    
    <div class="flex justify-start items-center text-[8.5px] text-slate-500 font-bold select-none font-mono mb-1">
      <span>5</span>
    </div>
  </div>

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

  // Filter logs specifically belonging to this work
  const workLogs = allLogs.filter((log) => log.workId === work.id);

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
  const formatTimeExtension = (originalTerm: string, addedDays: number) => {
    if (!addedDays) return originalTerm || "12 meses";
    return `${originalTerm || "12 meses"} aditivados de +${addedDays} dias`;
  };

  const addDaysToDate = (dateStr: string, daysToAdd: number) => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T12:00:00");
    if (isNaN(date.getTime())) return dateStr;
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split("T")[0];
  };

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

  // Action: Add new additive
  const handleCreateAdditive = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdditiveError("");

    if (!addNo.trim()) return setAdditiveError("Preencha o número do termo aditivo.");
    if (!addDesc.trim()) return setAdditiveError("Preencha a descrição do termo aditivo.");
    if (!addDate) return setAdditiveError("Selecione a data de assinatura.");

    const valNum = Number(addValue);
    if ((addType === "financeiro" || addType === "misto") && (isNaN(valNum) || valNum <= 0)) {
      return setAdditiveError("Insira um valor financeiro válido maior que zero.");
    }

    const daysVigNum = parseInt(addDaysVigencia, 10) || 0;
    const daysExecNum = parseInt(addDaysExecucao, 10) || 0;

    if (addType === "prazo" || addType === "misto") {
      if (daysVigNum < 0) {
        return setAdditiveError("Insira uma quantidade de dias válidos para prorrogação de Vigência.");
      }
      if (daysExecNum < 0) {
        return setAdditiveError("Insira uma quantidade de dias válidos para prorrogação de Execução.");
      }
      if (daysVigNum === 0 && daysExecNum === 0) {
        return setAdditiveError("Insira pelo menos 1 dia de prorrogação para Vigência ou Execução.");
      }
    }

    setIsSavingAdditive(true);
    try {
      const newAdd: ContractAdditive = {
        id: `add-${Date.now()}`,
        number: addNo.trim(),
        type: addType,
        value: addType !== "prazo" ? valNum : undefined,
        days: addType !== "financeiro" ? (daysExecNum || daysVigNum || undefined) : undefined,
        daysVigencia: addType !== "financeiro" ? daysVigNum : undefined,
        daysExecucao: addType !== "financeiro" ? daysExecNum : undefined,
        newVigenciaDate: (addType !== "financeiro" && addNewVigenciaDate) ? addNewVigenciaDate : undefined,
        newExecucaoDate: (addType !== "financeiro" && addNewExecucaoDate) ? addNewExecucaoDate : undefined,
        description: addDesc.trim(),
        signatureDate: addDate
      };

      const updatedAdditives = [...currentAdditives, newAdd];
      
      // Compute updated deadlines if deadline additive
      let updatedDeadline = work.deadlineDate;
      let updatedActiveContractDate = work.activeContractDate;

      if (addType === "prazo" || addType === "misto") {
        if (addNewExecucaoDate) {
          updatedDeadline = addNewExecucaoDate;
        }
        if (addNewVigenciaDate) {
          updatedActiveContractDate = addNewVigenciaDate;
        }
      }

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
      setShowAddAdditive(false);
    } catch (err) {
      console.error(err);
      setAdditiveError("Erro ao registrar aditivo virtualmente.");
    } finally {
      setIsSavingAdditive(false);
    }
  };

  // Action: Delete an additive
  const handleDeleteAdditive = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este termo aditivo?")) return;

    try {
      const deletedItem = currentAdditives.find(a => a.id === id);
      const updatedAdditives = currentAdditives.filter((a) => a.id !== id);

      // Revert deadlines if deleted item had days
      let updatedDeadline = work.deadlineDate;
      let updatedActiveContractDate = work.activeContractDate;

      if (deletedItem && (deletedItem.type === "prazo" || deletedItem.type === "misto")) {
        const subtractDaysFromDate = (dateStr: string, daysToSub: number) => {
          const date = new Date(dateStr + "T12:00:00");
          if (isNaN(date.getTime())) return dateStr;
          date.setDate(date.getDate() - daysToSub);
          return date.toISOString().split("T")[0];
        };
        const subExecucao = deletedItem.daysExecucao ?? deletedItem.days ?? 0;
        const subVigencia = deletedItem.daysVigencia ?? deletedItem.days ?? 0;

        if (subExecucao > 0) {
          updatedDeadline = subtractDaysFromDate(work.deadlineDate, subExecucao);
        }
        if (subVigencia > 0) {
          updatedActiveContractDate = subtractDaysFromDate(work.activeContractDate, subVigencia);
        }
      }

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

        {/* Action Excel / PDF Buttons */}
        <div className="flex gap-2.5 self-stretch md:self-auto justify-end sm:w-full md:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-705 border border-slate-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel Ficha</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Pronto</span>
          </button>
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
          onClick={() => setActiveTab("drive")}
          className={`px-4.5 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "drive"
              ? "border-amber-500 text-slate-900 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <HardDrive className="w-3.5 h-3.5 text-blue-500" />
          <span>Google Drive Nuvem</span>
        </button>

        <button
          onClick={() => setActiveTab("revisoes")}
          className={`px-4.5 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "revisoes"
              ? "border-amber-500 text-slate-900 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Histórico de Revisões</span>
          <span className="text-[10px] px-1.5 py-px bg-slate-100 rounded text-slate-600 font-mono font-bold">
            0
          </span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4.5 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "logs"
              ? "border-amber-500 text-slate-900 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Logs de Alterações</span>
          <span className="text-[10px] px-1.5 py-px bg-slate-100 rounded text-slate-600 font-mono font-bold">
            {workLogs.length}
          </span>
        </button>
      </div>

      {/* 3. Render and Display Active Tab Contents */}
      {activeTab === "ficha" && (
        <div className="space-y-6" id="detail-ficha-technical-tab">
          {/* Top Cards row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
              <div className="absolute right-4 top-4 p-2 bg-blue-50 text-blue-600 rounded-xl shadow-2xs">
                <Clock className="w-5 h-5" />
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
              <div className="absolute right-4 top-4 p-2 bg-emerald-50 text-emerald-600 rounded-xl shadow-2xs">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="text-[11px] text-slate-450 font-semibold mt-4 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 flex justify-between">
                <span>Original licitado:</span>
                <strong className="text-slate-600 font-mono">{formatCurrency(originalValue)}</strong>
              </div>
            </div>

            {/* Card 3: Vigência Aditivada */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between min-h-[120px]">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Vigência Aditivada
                </span>
                <p className="text-xl font-bold text-slate-900 tracking-tight mt-1">
                  {formatTimeExtension(work.termDaysVigencia || "12 meses", totalVigenciaDaysExtended)}
                </p>
                <div className="text-[10px] text-slate-450 font-mono font-bold mt-1.5">
                  Termo vigente: <span className="text-amber-600 font-semibold">{formatDate(work.activeContractDate)}</span>
                </div>
              </div>
              <div className="absolute right-4 top-4 p-2 bg-amber-50 text-amber-600 rounded-xl shadow-2xs">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="text-[11px] text-slate-450 font-semibold mt-4.5 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 flex justify-between">
                <span>Original inicial:</span>
                <strong className="text-slate-600">{work.termDaysVigencia || "12 meses"}</strong>
              </div>
            </div>
          </div>

          {/* Dados do Expediente de Engenharia Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-slate-700" />
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Dados do Expediente de Engenharia
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
                  <span className="text-slate-450 font-bold col-span-1">Processo Administrativo:</span>
                  <span className="text-slate-800 font-bold col-span-2 text-right md:text-left">
                    {work.adminProcess || "Não informado"}
                  </span>
                </div>
                <div className="flex justify-between md:grid md:grid-cols-3 border-b border-slate-100 pb-2.5">
                  <span className="text-slate-450 font-bold col-span-1">Ordem de Início de Obras:</span>
                  <span className="text-slate-800 font-bold font-mono col-span-2 text-right md:text-left">
                    {formatDate(work.startOrderDate)}
                  </span>
                </div>
                <div className="flex justify-between md:grid md:grid-cols-3 border-b border-slate-100 pb-2.5">
                  <span className="text-slate-450 font-bold col-span-1">Início Físico Efetivo em Campo:</span>
                  <span className="text-slate-800 font-bold font-mono col-span-2 text-right md:text-left">
                    {formatDate(work.physicalStartDate)}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
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
                  <span className="text-slate-800 font-bold col-span-2 text-right md:text-left">
                    {formatTimeExtension(work.termDaysExecucao || "12 meses", totalDaysExtended)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "aditivos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start" id="detail-aditivos-tab">
          {/* Aditamentos List Timeline (takes 2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center bg-transparent">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">
                Cronologia de Adições & Marcos Técnicos
              </h3>
              <button
                onClick={() => setShowAddAdditive(!showAddAdditive)}
                className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Aditivo</span>
              </button>
            </div>

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
                {currentAdditives.map((add, index) => (
                  <div
                    key={add.id}
                    className="bg-white border border-slate-200 rounded-xl p-4.5 flex gap-4 items-start shadow-2xs relative group hover:border-amber-300 transition"
                  >
                    <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl font-bold text-xs uppercase shadow-2xs">
                      #{index + 1}
                    </div>
                    
                    <div className="flex-grow space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{add.number}</span>
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

                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        {add.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500 font-medium pt-1.5 border-t border-slate-100 mt-2">
                        {add.value && (
                          <span className="flex items-center gap-1 font-bold text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            <DollarSign className="w-3.5 h-3.5" />
                            Acréscimo: {formatCurrency(add.value)}
                          </span>
                        )}
                        {/* Days / dates for Vigência */}
                        {add.daysVigencia !== undefined && add.daysVigencia > 0 && (
                          <span className="flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                            <Clock className="w-3.2 h-3.2 text-purple-500" />
                            Vigência: +{add.daysVigencia} dias
                          </span>
                        )}
                        {add.newVigenciaDate && (
                          <span className="flex items-center gap-1 font-mono text-purple-700 font-bold bg-purple-50/50 px-2 py-0.5 rounded border border-purple-100/50">
                            <Calendar className="w-3.2 h-3.2 text-purple-500" />
                            Fim Vigência: {formatDate(add.newVigenciaDate)}
                          </span>
                        )}
                        {/* Days / dates for Execução */}
                        {add.daysExecucao !== undefined && add.daysExecucao > 0 && (
                          <span className="flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            <Clock className="w-3.2 h-3.2 text-indigo-500" />
                            Execução: +{add.daysExecucao} dias
                          </span>
                        )}
                        {add.newExecucaoDate && (
                          <span className="flex items-center gap-1 font-mono text-indigo-700 font-bold bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100/50">
                            <Calendar className="w-3.2 h-3.2 text-indigo-500" />
                            Previsão Conclusão: {formatDate(add.newExecucaoDate)}
                          </span>
                        )}
                        {/* Fallback legacy display if separate ones aren't populated */}
                        {add.daysVigencia === undefined && add.daysExecucao === undefined && add.days && (
                          <span className="flex items-center gap-1 font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            <Clock className="w-3.5 h-3.5" />
                            Prorrogação: +{add.days} dias
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-400 font-semibold font-mono">
                          <Calendar className="w-3.5 h-3.5" />
                          Assinatura: {formatDate(add.signatureDate)}
                        </span>
                      </div>
                    </div>

                    {/* Delete item button */}
                    <button
                      onClick={() => handleDeleteAdditive(add.id)}
                      className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 rounded-lg hover:border-rose-200 transition cursor-pointer md:opacity-0 group-hover:opacity-100"
                      title="Excluir Aditivo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Overall work key chronology milestones list */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest pb-1.5 border-b border-slate-100">
                Resumo Geral Cronológico da Obra
              </h3>
              
              <div className="relative pl-5 border-l-2 border-slate-150 space-y-6 text-xs text-slate-500 py-1">
                {work.signingDate && (
                  <div className="relative">
                    <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-slate-350 border-2 border-white" />
                    <p className="font-bold text-slate-700">Assinatura do Contrato de Obra</p>
                    <p className="font-mono text-[10px] text-slate-400 mt-0.5">{formatDate(work.signingDate)}</p>
                  </div>
                )}
                {work.publicationDateJom && (
                  <div className="relative">
                    <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-slate-350 border-2 border-white" />
                    <p className="font-bold text-slate-700">Publicação no Diário Oficial JOM</p>
                    <p className="font-mono text-[10px] text-slate-400 mt-0.5">{formatDate(work.publicationDateJom)}</p>
                  </div>
                )}
                {work.startOrderDate && (
                  <div className="relative">
                    <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-amber-550 border-2 border-white" />
                    <p className="font-bold text-slate-700">Disparo da Ordem de Início (O.S.)</p>
                    <p className="font-mono text-[10px] text-slate-400 mt-0.5">{formatDate(work.startOrderDate)}</p>
                  </div>
                )}
                {work.physicalStartDate && (
                  <div className="relative">
                    <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-teal-555 border-2 border-white" />
                    <p className="font-bold text-slate-700">Mobilização Física e Início de Serviços e Campo</p>
                    <p className="font-mono text-[10px] text-slate-400 mt-0.5">{formatDate(work.physicalStartDate)}</p>
                  </div>
                )}
                
                {/* Dynamically interleave aditivos */}
                {currentAdditives.map((add) => (
                  <div key={add.id} className="relative">
                    <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-purple-550 border-2 border-white" />
                    <p className="font-bold text-purple-750">Termo Aditivo Homologado ({add.number})</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">{add.description}</p>
                    <p className="font-mono text-[10px] text-slate-400 mt-1">Assinado: {formatDate(add.signatureDate)}</p>
                  </div>
                ))}

                <div className="relative">
                  <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-emerald-550 border-2 border-white" />
                  <p className="font-bold text-slate-900">Prazo Estimado de Liberação / Conclusão</p>
                  <p className="text-slate-455 font-semibold font-mono text-[10px] mt-0.5">
                    Previsão final recalibrada: {formatDate(work.deadlineDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Create additive form (takes 1 col) */}
          <div className="lg:col-span-1 space-y-4 sticky top-20">
            
            {/* Foto da Cronologia Física (Card) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider block flex items-center gap-1.5 animate-pulse-slow">
                  <Camera className="w-4 h-4 text-amber-500" />
                  <span>Foto da Cronologia Física</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 block leading-relaxed">
                  Será exibida na página 3 (Cronologia da Obra) do PDF Gerado para documentar os marcos físicos.
                </p>
              </div>

              {work.timelineImage ? (
                <div className="relative w-full aspect-video bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group shadow-2xs">
                  <img
                    src={work.timelineImage}
                    alt="Cronograma da Obra"
                    className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveTimelineImage()}
                      className="p-2 bg-rose-600 hover:bg-rose-500 rounded-lg text-white text-xs font-bold transition shadow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center bg-slate-50/50">
                  <ImageIcon className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                  <p className="text-[11px] text-slate-500 font-bold">Nenhum cronograma oficial anexado</p>
                  <p className="text-[10px] text-slate-400">Insira a imagem de marcos da obra abaixo.</p>
                </div>
              )}

              <div className="flex gap-2">
                <label className="flex-grow flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2 px-3 rounded-xl text-xs transition border border-slate-250 cursor-pointer shadow-3xs select-none">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{work.timelineImage ? "Substituir Foto" : "Inserir Foto Cronologia"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleTimelineImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {(showAddAdditive || currentAdditives.length === 0) && (
              <form
                onSubmit={handleCreateAdditive}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4"
              >
                <div>
                  <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider block">
                    Inserir Termo Aditivo
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 block">
                    Atualiza cronograma e montante financeiro
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
                    <option value="prazo">Prazo de Execução (+ Dias)</option>
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
                          Prorrogação de Vigência (Dias)
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
                              setAddNewVigenciaDate(addDaysToDate(work.activeContractDate, d));
                            } else {
                              setAddNewVigenciaDate("");
                            }
                          }}
                          placeholder="Ex: 90"
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
                        <p className="text-[9px] text-slate-400 italic block">
                          Original: {formatDate(work.activeContractDate)}
                        </p>
                      </div>
                    </div>

                    {/* 2. Prazo de Execução Group */}
                    <div className="space-y-2 border-t border-slate-200/50 pt-2.5 mt-2.5">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                          Prorrogação de Execução (Dias)
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
                              setAddNewExecucaoDate(addDaysToDate(work.deadlineDate, d));
                            } else {
                              setAddNewExecucaoDate("");
                            }
                          }}
                          placeholder="Ex: 90"
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
                        <p className="text-[9px] text-slate-400 italic block">
                          Original: {formatDate(work.deadlineDate)}
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

                {/* Description */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Descrição de Motivo / Notas Técnicas
                  </label>
                  <textarea
                    required
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
                    onClick={() => setShowAddAdditive(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-[11px] transition cursor-pointer"
                  >
                    Ocultar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAdditive}
                    className="px-4.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>Gravar Aditivo</span>
                  </button>
                </div>
              </form>
            )}

            {/* Quick Context Card */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xs">
              <span className="text-[9px] text-amber-500 uppercase tracking-widest font-extrabold block">Parâmetros de Auditoria</span>
              <h4 className="text-xs font-bold leading-snug">Metodologia e Registros</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed font-light">
                Qualquer aditivo contratual lançado será inserido e recalculado nos cards principais e históricos operacionais de forma automática, garantindo conformidade nos relatórios do TCE e na transparência pública.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "lancamentos" && (
        <div className="space-y-4 animate-fade-in" id="detail-lancamentos-tab">
          
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-transparent pb-1">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Logs className="w-4.5 h-4.5 text-amber-500" />
                <span>Boletins de Campo e Diários de Obra</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Controle cronológico de avanços físicos e conformidades operacionais
              </p>
            </div>
            
            <button
              onClick={() => setIsActivityModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Lançar Atividades Semanal</span>
            </button>
          </div>

          {workLogs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-4 shadow-2xs">
              <FileCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h4 className="font-bold text-slate-700">Nenhum diário ou boletim registrado</h4>
                <p className="text-xs text-slate-450 mt-1 max-w-sm mx-auto">
                  Ainda não existem lançamentos de medições físicas e boletins operacionais de acompanhamento para esta obra.
                </p>
              </div>
              <button
                onClick={() => setIsActivityModalOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-750 font-extrabold text-xs px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-slate-500" />
                <span>Criar Primeiro Relatório</span>
              </button>
            </div>
          ) : (() => {
            const activeLog = workLogs.find(log => log.id === selectedLogId) || workLogs[0];
            const parsed = parseWeeklyReport(activeLog.notes);
            
            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT COLUMN: Weeks sidebar */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4.5 space-y-4 shadow-2xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Relatórios Semanais
                    </span>
                    <button
                      onClick={() => setIsActivityModalOpen(true)}
                      className="border border-slate-200 hover:border-amber-500 hover:bg-amber-50/30 text-slate-600 hover:text-amber-800 px-2.5 py-1 rounded-lg text-[10px] font-bold transition duration-150 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Novo Relatório</span>
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {workLogs.map((log) => {
                      const logParsed = parseWeeklyReport(log.notes);
                      const isActive = log.id === activeLog.id;
                      
                      return (
                        <div
                          key={log.id}
                          onClick={() => {
                            setSelectedLogId(log.id);
                            setIsEditingReport(false);
                          }}
                          className={`p-4 rounded-xl cursor-pointer transition flex flex-col gap-1 relative border ${
                            isActive
                              ? "bg-[rgb(15,23,42)] border-slate-900 text-white shadow-md"
                              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800 hover:bg-slate-50/40"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-extrabold text-xs pr-4">
                              Acompanhamento Semanal
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`font-mono text-xs font-black ${
                                isActive ? "text-amber-400" : "text-sky-600"
                              }`}>
                                {log.newProgress}%
                              </span>
                              {onDeleteLog && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm("Deseja realmente excluir este relatório semanal?")) {
                                      onDeleteLog(log.id);
                                    }
                                  }}
                                  className={`p-1 rounded-full transition ${isActive ? "hover:bg-slate-700 text-slate-400 hover:text-red-500" : "hover:bg-slate-100 text-slate-400 hover:text-red-500"}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <span className={`text-[10px] ${
                            isActive ? "text-slate-400" : "text-slate-500"
                          } font-medium`}>
                            {logParsed.period}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT COLUMN: Selected Weekly Report detail */}
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
                  
                  {/* Title and control bar */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 pb-4 border-b border-slate-150">
                    <div>
                      <h4 className="text-base font-black text-slate-900 tracking-tight">
                        Relatório Semanal de Campo
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-1">
                        Período de Medição: <span className="font-bold text-slate-700">{parsed.period}</span>
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          setEditNotesText(activeLog.notes);
                          setIsEditingReport(true);
                        }}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition duration-150 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Editar Report</span>
                      </button>
                      
                      <button
                        onClick={() => handleExportPDF(activeLog)}
                        className="bg-amber-50 hover:bg-amber-100/85 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-xl text-xs font-extrabold transition duration-150 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-600" />
                        <span>Exportar PDF da Semana</span>
                      </button>
                    </div>
                  </div>

                  {isEditingReport ? (
                    /* Inline editable notepad styled beautifully */
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (onUpdateLogNotes) {
                          await onUpdateLogNotes(activeLog.id, editNotesText);
                        }
                        setIsEditingReport(false);
                      }} 
                      className="space-y-4 pt-4"
                    >
                      <div className="space-y-1">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                          Conteúdo Estruturado do Relatório
                        </label>
                        <textarea
                          rows={14}
                          value={editNotesText}
                          onChange={(e) => setEditNotesText(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-400 focus:ring-1 focus:ring-amber-300 rounded-xl p-4 text-xs font-mono text-slate-800 focus:outline-none transition leading-relaxed shadow-2xs"
                        />
                      </div>
                      
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setIsEditingReport(false)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-2xs cursor-pointer"
                        >
                          Salvar Alterações
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Normal Display View matching the user's layout example perfectly */
                    <div className="space-y-6 pt-4">
                      
                      {/* Bento metric grid boxes */}
                      <div className="grid grid-cols-2 md:grid-cols-4 bg-slate-50/50 border border-slate-200 rounded-2xl overflow-hidden divide-x divide-y md:divide-y-0 divide-slate-250">
                        <div className="p-4 bg-slate-50/10">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Avanço Físico Real:
                          </span>
                          <p className="text-sm font-black text-slate-800 tracking-tight mt-1">
                            {activeLog.newProgress}%
                          </p>
                        </div>
                        
                        <div className="p-4 bg-slate-50/10">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Situação do Aditivo:
                          </span>
                          <p className="text-sm font-black text-slate-800 tracking-tight mt-1">
                            {parsed.sitacaoAditivo || "N/A"}
                          </p>
                        </div>
                        
                        <div className="p-4 bg-slate-50/10">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Rede ENEL (Média T.:):
                          </span>
                          <p className="text-sm font-black text-slate-800 tracking-tight mt-1">
                            {parsed.enelStatus || "N/A"}
                          </p>
                        </div>
                        
                        <div className="p-4 bg-slate-50/10">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Subestação Elétrica:
                          </span>
                          <p className="text-sm font-black text-slate-800 tracking-tight mt-1">
                            {parsed.substationStatus || "N/A"}
                          </p>
                        </div>
                      </div>

                      {/* Section 1: • ATIVIDADES DESENVOLVIDAS NA SEMANA */}
                      <div className="space-y-3">
                        <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 shadow-2xs">
                          <span>• ATIVIDADES DESENVOLVIDAS NA SEMANA:</span>
                        </h5>
                        
                        {parsed.weeklyActivities.length === 0 ? (
                          <p className="text-xs text-slate-400 italic pl-4">Nenhuma atividade descrita nesta semana.</p>
                        ) : (
                          <div className="space-y-2.5 pl-1">
                            {parsed.weeklyActivities.map((act, i) => (
                              <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed font-semibold bg-slate-50/10 p-2.5 border border-slate-100 rounded-xl">
                                <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                <span>{act}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Section 2: • ATIVIDADES PROGRAMADAS PARA PRÓXIMA SEMANA */}
                      <div className="space-y-3 pt-2">
                        <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                          <span>• ATIVIDADES PROGRAMADAS PARA PRÓXIMA SEMANA:</span>
                        </h5>
                        
                        {parsed.nextWeekActivities.length === 0 ? (
                          <p className="text-xs text-slate-400 italic pl-4">Nenhuma atividade agendada para a próxima semana.</p>
                        ) : (
                          <div className="space-y-2.5 pl-1">
                            {parsed.nextWeekActivities.map((act, i) => (
                              <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed font-semibold bg-slate-50/10 p-2.5 border border-slate-100 rounded-xl">
                                <ArrowUpRight className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                <span>{act}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Section 3: Observações, Não Conformidades... */}
                      <div className="space-y-3 pt-2">
                        <h5 className="text-xs font-black text-rose-800 uppercase tracking-widest flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                          <span>• OBSERVAÇÕES, NÃO CONFORMIDADES & ALERTAS DE FISCALIZAÇÃO:</span>
                        </h5>
                        
                        <div className="border border-rose-100 bg-rose-50/10 p-4 rounded-xl text-xs text-slate-800 leading-relaxed font-semibold min-h-[50px] flex items-center">
                          {parsed.observations.length === 0 ? (
                            <p className="text-slate-400 font-medium italic">Nenhum apontamento crítico de fiscalização nesta semana.</p>
                          ) : (
                            <div className="space-y-1.5 w-full">
                              {parsed.observations.map((obs, i) => (
                                <p key={i} className="flex items-start gap-2">
                                  <span className="text-rose-500 mt-0.5">•</span>
                                  <span>{obs}</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Metadata */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-100 text-[10px] text-slate-400 font-mono font-medium">
                        <span>Lançado por: <span className="font-bold text-slate-500">{activeLog.userName} ({activeLog.userRole})</span></span>
                        <span>Registro: {formatDate(activeLog.timestamp)}</span>
                      </div>
                    </div>
                  )}

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

      {activeTab === "revisoes" && (
        <div className="space-y-4 animate-fade-in text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-405" id="detail-revisoes-tab">
          <History className="w-12 h-12 text-slate-350 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-slate-700">Nenhuma revisão de dados homologada</h3>
            <p className="text-xs text-slate-455 max-w-sm mx-auto">
              As revisões snapshots registradas para fins de auditoria interna ficam listadas neste painel técnico.
            </p>
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="space-y-4 animate-fade-in" id="detail-logs-tab">
          <div className="flex justify-between items-center bg-transparent">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
              <Logs className="w-4 h-4 text-slate-550" />
              Logs de Modificação do Contrato
            </h3>
            <span className="text-xs text-slate-500 font-medium font-mono">
              Total: {workLogs.length} logs
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100">
            {workLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                Sem registros de modificação técnica.
              </div>
            ) : (
              workLogs.map((log) => (
                <div key={log.id} className="p-4.5 flex gap-4 text-xs">
                  <div className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 font-bold font-mono h-fit">
                    LOG
                  </div>
                  <div className="flex-grow space-y-1">
                    <p className="font-bold text-slate-800">
                      Operação Homologada por: {log.userName} ({log.userRole})
                    </p>
                    <p className="text-slate-550 italic leading-relaxed">
                      "{log.notes}"
                    </p>
                    <div className="flex gap-4 text-[10px] text-slate-400 font-mono font-bold mt-1">
                      <span>Timestamp: {formatDate(log.timestamp)}</span>
                      <span>Progressão: {log.oldProgress}% → {log.newProgress}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        work={work}
        onSubmittingActivity={onLaunchMeasurement}
        activeUser={activeUser}
      />
    </div>
  );
}
