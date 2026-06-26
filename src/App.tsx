import React, { useState, useEffect } from "react";
import { Obra, UpdateLog, DatabaseState, UserProfile, USER_PROFILES, ContractAdditive } from "./types";
import { formatDate, formatCurrency, formatPercent } from "./utils";
import { supabase } from "./supabase";

// Custom visual components
import ContractOverview from "./components/ContractOverview";
import DashboardFilters from "./components/DashboardFilters";
import UserAccessControl from "./components/UserAccessControl";
import WorkCard from "./components/WorkCard";
import WorkModal from "./components/WorkModal";
import WorkDetail from "./components/WorkDetail";

// Icons from Lucide
import { Plus, Construction, ClipboardList, Activity, AlertTriangle, CheckSquare, RefreshCw, Layers, Cloud, Database, Sliders, ArrowUp, ArrowDown, Users, X } from "lucide-react";

const DEFAULT_FALLBACK_STATE: DatabaseState = {
  contractName: "Contrato de Supervisão nº 085/2025 - DER/PR",
  supervisorCompany: "Quanta Consultoria e Engenharia",
  contractValue: 3450000,
  contractStartDate: "2025-01-15",
  contractEndDate: "2027-01-15",
  contractAdditives: [
    {
      id: "add-1",
      number: "Aditivo 01/2025",
      type: "financeiro",
      value: 450000,
      description: "Acréscimo para serviços extraordinários de sondagem rotativa.",
      signatureDate: "2025-04-10"
    },
    {
      id: "add-2",
      number: "Aditivo 02/2025",
      type: "prazo",
      days: 180,
      description: "Prorrogação de prazo devido a atraso na liberação de licenças ambientais.",
      signatureDate: "2025-05-22"
    }
  ],
  works: [
    {
      id: "obra-1",
      name: "Duplicação da Rodovia BR-277",
      contractNumber: "CTR-DER-104/2024",
      startDate: "2024-03-10",
      deadlineDate: "2026-09-30",
      activeContractDate: "2026-12-31",
      progress: 65,
      contractorName: "Egesa Engenharia S.A.",
      biddedValue: 45800000,
      status: "em_andamento"
    },
    {
      id: "obra-2",
      name: "Construção de Ponte Estaiada sobre o Rio Iguaçu",
      contractNumber: "CTR-DER-203/2024",
      startDate: "2024-05-15",
      deadlineDate: "2026-07-30",
      activeContractDate: "2026-10-31",
      progress: 88,
      contractorName: "Queiroz Galvão S.A.",
      biddedValue: 28500000,
      status: "em_andamento"
    },
    {
      id: "obra-3",
      name: "Restauração de Intercalares e Pavimentação PR-412",
      contractNumber: "CTR-DER-011/2025",
      startDate: "2025-01-20",
      deadlineDate: "2025-12-20",
      activeContractDate: "2026-03-31",
      progress: 25,
      contractorName: "Castilho Engenharia",
      biddedValue: 12400000,
      status: "em_andamento"
    }
  ],
  logs: [
    {
      id: "log-1",
      workId: "obra-1",
      workName: "Duplicação da Rodovia BR-277",
      userName: "Supervisão",
      userRole: "Supervisor",
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      oldProgress: 60,
      newProgress: 65,
      notes: "Homologação do asfalto CBUQ no subtrecho km 18 e conclusão da drenagem lateral."
    },
    {
      id: "log-2",
      workId: "obra-2",
      workName: "Construção de Ponte Estaiada sobre o Rio Iguaçu",
      userName: "Supervisão",
      userRole: "Supervisor",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      oldProgress: 85,
      newProgress: 88,
      notes: "Acompanhamento da concretagem do pilar central e avanço das aduelas metálicas."
    }
  ],
  authorizedUsers: []
};

export default function App() {
  // Database state
  const [state, setState] = useState<DatabaseState>({
    contractName: "",
    supervisorCompany: "",
    works: [],
    logs: [],
    authorizedUsers: []
  });

  const [loading, setLoading] = useState(true);
  const [errorHeader, setErrorHeader] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [useDirectSupabaseMode, setUseDirectSupabaseMode] = useState(false);

  // Active user profile context for field signatures
  const [activeUser, setActiveUser] = useState<UserProfile>(USER_PROFILES[0]);

  // Filters and views state
  const [search, setSearch] = useState("");
  const [reportWeek, setReportWeek] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("posicao");
  const [isReorderMode, setIsReorderMode] = useState(false);

  // Form Modals Toggles
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAccessControlOpen, setIsAccessControlOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<Obra | null>(null);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  
  // Authorization state
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>("vinicius.martins@quantaconsultoria.com");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(true);

  // Authentication prompts and checks have been removed to make the app accessible without logging in.

  /**
   * Loads state from localStorage or Supabase directly. Used when the backend server is unavailable.
   */
  const loadDirectSupabaseState = async () => {
    try {
      const { data, error } = await supabase
        .from("contract_state")
        .select("data")
        .eq("id", "current_state")
        .maybeSingle();

      if (error) {
        console.warn("Direct connection to Supabase failed:", error.message);
        const isMissingTable = error.code === "PGRST205" || error.message.includes("Could not find the table");
        const isRls = error.code === "42501" || error.message.includes("violates row-level security");

        // Fallback to default
        const restoredState = DEFAULT_FALLBACK_STATE;

        setState({
          ...restoredState,
          supabaseStatus: {
            connected: true,
            tableExists: !isMissingTable,
            rlsEnabled: isRls,
            error: error.message
          }
        });
        setErrorHeader("");
        return;
      }

      setErrorHeader("");
      
      if (!data) {
        console.log("Supabase table is empty. Initializing data from client fallback...");
        // Try to fetch from Supabase first
        const { data: fetchedData, error: fetchError } = await supabase
          .from("contract_state")
          .select("data")
          .eq("id", "current_state")
          .single();

        let stateToUse: DatabaseState;
        if (fetchedData) {
          stateToUse = fetchedData.data as DatabaseState;
        } else {
          stateToUse = DEFAULT_FALLBACK_STATE;
        }

        // Update Supabase to be sure
        await supabase
          .from("contract_state")
          .upsert({ id: "current_state", data: stateToUse, updated_at: new Date().toISOString() });

        setState({
          ...stateToUse,
          supabaseStatus: {
            connected: !fetchError,
            tableExists: !fetchError,
            rlsEnabled: !!fetchError,
            error: fetchError ? fetchError.message : ""
          }
        });
        await supabase
          .from("contract_state")
          .upsert({ id: "current_state", data: stateToUse, updated_at: new Date().toISOString() });
      } else {
        await supabase
          .from("contract_state")
          .upsert({ id: "current_state", data: data.data, updated_at: new Date().toISOString() });
        setState({
          ...(data.data as DatabaseState),
          supabaseStatus: {
            connected: true,
            tableExists: true,
            rlsEnabled: false,
            error: ""
          }
        });
      }
    } catch (err: any) {
      console.warn("Exception in direct Supabase connection:", err.message);
      const isRls = err.message.includes("violates row-level security") || err.message.includes("42501");
      const restoredState = DEFAULT_FALLBACK_STATE;

      setState({
        ...restoredState,
        supabaseStatus: {
          connected: false,
          tableExists: !err.message.includes("PGRST205"),
          rlsEnabled: isRls,
          error: err.message
        }
      });
      setErrorHeader("");
    }
  };

  /**
   * Helper that upserts data to client-side localStorage and tries direct Supabase transfer.
   */
  const saveStateDirect = async (updatedState: DatabaseState) => {
    setState(updatedState);

    try {
      const { error } = await supabase
        .from("contract_state")
        .upsert({ id: "current_state", data: updatedState, updated_at: new Date().toISOString() });

      if (error) {
        console.warn("Direct save to Supabase error:", error.message);
        const isRls = error.code === "42501" || error.message.includes("violates row-level security");
        const isMissingTable = error.code === "PGRST205" || error.message.includes("Could not find the table");
        
        setState(prev => ({
          ...prev,
          supabaseStatus: {
            connected: true,
            tableExists: !isMissingTable,
            rlsEnabled: isRls,
            error: error.message
          }
        }));
      } else {
        setState(prev => ({
          ...prev,
          supabaseStatus: {
            connected: true,
            tableExists: true,
            rlsEnabled: false,
            error: ""
          }
        }));
      }
    } catch (err: any) {
      console.warn("Direct save to Supabase exception:", err.message);
      const isRls = err.message.includes("violates row-level security") || err.message.includes("42501");
      setState(prev => ({
        ...prev,
        supabaseStatus: {
          connected: false,
          tableExists: true,
          rlsEnabled: isRls,
          error: err.message
        }
      }));
    }
  };

  // Load contract details from server with robust retry mechanism
  const loadState = async (showLoadingIndicator = false) => {
    if (showLoadingIndicator) setLoading(true);
    setIsSyncing(true);
    
    try {
      let success = false;
      let data: DatabaseState | null = null;
      let attempts = 2; // Keep attempts short to fallback faster
      let lastError: any = null;

      while (attempts > 0 && !success) {
        try {
          // Timeout of 5 seconds
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const res = await fetch("/api/contract", { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (!res.ok) throw new Error("Falha ao consultar estado no servidor.");
          data = (await res.json()) as DatabaseState;
          success = true;
        } catch (err) {
          lastError = err;
          attempts--;
          console.warn("loadState attempt failed:", err);
          if (attempts > 0) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }

      if (success && data) {
        setState(data);
        setErrorHeader("");
        setUseDirectSupabaseMode(false);
      } else {
        console.warn("Backend API not responding/offline. Falling back to direct client-side Supabase/LocalStorage connection.");
        setUseDirectSupabaseMode(true);
        await loadDirectSupabaseState();
      }
    } catch (err) {
      console.error("Critical error in loadState:", err);
    } finally {
      if (showLoadingIndicator) setLoading(false);
      setIsSyncing(false);
    }
  };

  // Synchronize on startup
  useEffect(() => {
    loadState(true);

    // Real-time synchronization
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contract_state',
          filter: 'id=eq.current_state',
        },
        (payload: any) => {
          if (payload.new && payload.new.data) {
            setState(payload.new.data as DatabaseState);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update overall Contract Settings
  const handleUpdateAuthorizedUsers = async (newUsers: string[]) => {
    const updatedState = { ...state, authorizedUsers: newUsers };
    setState(updatedState);
    await supabase
      .from("contract_state")
      .upsert({ id: "current_state", data: updatedState, updated_at: new Date().toISOString() });
  };

  const handleUpdateSettings = async (
    contractName: string,
    supervisorCompany: string,
    contractValue?: number,
    contractStartDate?: string,
    contractEndDate?: string,
    contractAdditives?: ContractAdditive[]
  ) => {
    if (useDirectSupabaseMode) {
      const newState: DatabaseState = {
        ...state,
        contractName,
        supervisorCompany,
        contractValue,
        contractStartDate,
        contractEndDate,
        contractAdditives
      };
      await saveStateDirect(newState);
      return;
    }

    try {
      const res = await fetch("/api/contract/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractName,
          supervisorCompany,
          contractValue,
          contractStartDate,
          contractEndDate,
          contractAdditives
        })
      });
      if (!res.ok) throw new Error("Erro de servidor ao atualizar contrato.");
      await loadState();
    } catch (err) {
      console.error(err);
      setErrorHeader("Não foi possível salvar os dados do contrato no servidor.");
    }
  };

  // Register an entry in physical progression measurements
  const handleGenerateConsolidatedReport = () => {
    if (!reportWeek) {
      alert("Por favor, selecione uma semana para o relatório.");
      return;
    }

    // Helper functions for currency verbal representation and period handling
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

    // Helper to parse "Período: DD/MM/YYYY a DD/MM/YYYY" from notes
    const parsePeriodDates = (notes: string) => {
      if (!notes) return null;
      const periodMatch = notes.match(/(?:Período|Period):\s*\*?(\d{2})\/(\d{2})\/(\d{4})\s+a\s+(\d{2})\/(\d{2})\/(\d{4})/i);
      if (periodMatch) {
        const start = new Date(parseInt(periodMatch[3]), parseInt(periodMatch[2]) - 1, parseInt(periodMatch[1]));
        const end = new Date(parseInt(periodMatch[6]), parseInt(periodMatch[5]) - 1, parseInt(periodMatch[4]));
        return { start, end };
      }
      return null;
    };

    // Helper to get ISO week string "YYYY-Www"
    const getISOWeekString = (date: Date): string => {
      const target = new Date(date.valueOf());
      const dayNr = (date.getDay() + 6) % 7;
      target.setDate(target.getDate() - dayNr + 3);
      const firstThursday = target.valueOf();
      target.setMonth(0, 1);
      if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
      }
      const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
      const year = new Date(firstThursday).getFullYear();
      return `${year}-W${String(weekNum).padStart(2, '0')}`;
    };

    // Helper to get Monday and Friday of a week
    const getDatesOfISOWeek = (w: string) => {
      const parts = w.split("-W");
      if (parts.length !== 2) return null;
      const y = parseInt(parts[0], 10);
      const week = parseInt(parts[1], 10);

      const simple = new Date(y, 0, 4);
      const dayOfWeek = simple.getDay();
      const ISOdayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
      const monday = new Date(simple.getTime() - (ISOdayOfWeek - 1) * 86400000);
      monday.setDate(monday.getDate() + (week - 1) * 7);

      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);

      return { monday, friday };
    };

    const weekDates = getDatesOfISOWeek(reportWeek);
    let periodFormatted = "Período não disponível";
    if (weekDates) {
      const pad = (n: number) => n.toString().padStart(2, "0");
      const d1 = weekDates.monday;
      const d2 = weekDates.friday;
      periodFormatted = `${pad(d1.getDate())}/${pad(d1.getMonth() + 1)}/${d1.getFullYear()} a ${pad(d2.getDate())}/${pad(d2.getMonth() + 1)}/${d2.getFullYear()}`;
    }

    // Filter works that have at least one weekly report for the selected week
    const activeWorks = state.works
      .filter(w => {
        const logsForWork = state.logs.filter(log => {
          let logDate = new Date(log.timestamp);
          const parsed = parsePeriodDates(log.notes);
          if (parsed) {
            logDate = parsed.start;
          }
          const logWeekStr = getISOWeekString(logDate);
          return logWeekStr === reportWeek && log.workId === w.id;
        });
        return logsForWork.length > 0;
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (activeWorks.length === 0) {
      alert("Nenhuma obra com lançamentos registrados na semana em questão foi encontrada.");
      return;
    }

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

      const periodMatch = notesText.match(/(?:Período|Period):\s*\*?([^\n\r*]+)/i);
      if (periodMatch) {
        result.period = periodMatch[1].trim();
      }

      const aditivoMatch = notesText.match(/Situação do Aditivo:\*\*?\s*(.*)$/im);
      if (aditivoMatch) {
        result.sitacaoAditivo = aditivoMatch[1].trim().replace(/\*/g, '');
      }

      const infraMatch = notesText.match(/Infraestrutura de Dados:\*\*?\s*(.*)$/im);
      if (infraMatch) {
        result.infraDados = infraMatch[1].trim().replace(/\*/g, '');
      }

      const enelMatch = notesText.match(/Aumento de Carga \(ENEL\):\*\*?\s*(.*)$/im);
      if (enelMatch) {
        result.enelStatus = enelMatch[1].trim().replace(/\*/g, '');
      }

      const subMatch = notesText.match(/Subestação Elétrica:\*\*?\s*(.*)$/im);
      if (subMatch) {
        result.substationStatus = subMatch[1].trim().replace(/\*/g, '');
      }

      const relevantMatch = notesText.match(/Informação Relevante:\*\*?\s*(.*)$/im);
      if (relevantMatch) {
        result.relevantInfo = relevantMatch[1].trim().replace(/\*/g, '');
      }

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
            if (!line.startsWith("•") && !line.startsWith("-") && !line.startsWith("*")) {
              break;
            }
          }

          if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
            const content = line.replace(/^[•\-\*]\s*/, "").trim();
            if (content) bullets.push(content);
          } else if (line !== "" && !line.includes("**") && bullets.length > 0) {
            // keep going
          } else if (line !== "" && !line.includes("**") && bullets.length === 0) {
            bullets.push(line);
          }
        }
        return bullets;
      };

      result.weeklyActivities = extractSectionBullets("Atividades da Semana");
      result.nextWeekActivities = extractSectionBullets("Atividades da Próxima Semana");
      result.observations = extractSectionBullets("Observações & Apontamentos importantes");

      if (!result.isStandardReport || result.weeklyActivities.length === 0) {
        if (result.weeklyActivities.length === 0 && notesText) {
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

    let currentPage = 1;

    // Page 1: Cover Page (Capa)
    const coverPageHtml = `
  <!-- PAGE 1: COVER CARD (CAPA) -->
  <div class="page cover-page border border-slate-100 relative">
    <div class="absolute inset-0 z-0">
      <img src="/cover.jpg" class="w-full h-full object-cover" alt="Capa" />
    </div>
    <div class="page-content relative z-10 flex flex-col justify-end h-full">
      <div class="mb-[30mm] select-none text-left">
        <h1 style="font-family: Arial, sans-serif; font-size: 26pt; font-weight: bold; color: black; line-height: 1.25; margin: 0 0 6mm 0; text-transform: uppercase;">
          RELATÓRIO SEMANAL DE<br/>
          GERENCIAMENTO E FISCALIZAÇÃO<br/>
          TÉCNICA DE OBRAS
        </h1>
        
        <div style="font-family: Arial, sans-serif; font-size: 16pt; font-weight: bold; color: black; margin: 0 0 6mm 0;">
          ${periodFormatted}
        </div>
        
        <div style="font-family: 'Aptos Narrow', 'Aptos', sans-serif; font-size: 12pt; font-weight: bold; color: #f97316; margin: 0 0 5mm 0; text-transform: uppercase;">
          TERMO DE CONTRATO Nº 26/2025
        </div>
        
        <p style="font-family: Calibri, sans-serif; font-size: 16pt; font-weight: bold; color: black; line-height: 1.35; max-width: 630px; margin: 0;">
          Empresa especializada em engenharia para realização de serviços técnicos de Assessoramento, Gerenciamento, Supervisão, Fiscalização Técnica e Controle Tecnológico das obras que serão desenvolvidas no município de Maricá/RJ, no âmbito da CODEMAR.
        </p>
      </div>

      <div class="page-footer">${currentPage++}</div>
    </div>
  </div>
    `;

    // Page 2: Summary Table Page
    const summaryPageHtml = `
  <!-- PAGE 2: FICHA TÉCNICA CONTRATUAL CONSOLIDADA -->
  <div class="page watermark-page border border-slate-100">
    <div class="page-content flex flex-col h-full justify-between">
      <div class="flex-grow my-4 flex flex-col justify-start">
        <div style="background-color: #f97316; border: 0.3mm solid black; border-radius: 0px; padding: 7px 12px; text-align: center; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
          <h2 style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: black; margin: 0; text-transform: uppercase; letter-spacing: 0.1px;">
            FICHA TÉCNICA DO CONTRATO DE SUPERVISÃO
          </h2>
        </div>

        <table class="black-grid-table" style="margin-bottom: 20px;">
          <tbody>
            <tr>
              <td style="font-weight: bold; width: 45%;">Contrato de Supervisão:</td>
              <td style="font-weight: bold;">${state.contractName}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Empresa Supervisora:</td>
              <td>${state.supervisorCompany}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Início do Contrato:</td>
              <td>${formatDate(state.contractStartDate)}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Término do Contrato:</td>
              <td>${formatDate(state.contractEndDate)}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Valor do Contrato de Supervisão:</td>
              <td style="font-weight: bold;">${formatCurrency(state.contractValue)}</td>
            </tr>
          </tbody>
        </table>

        <div style="font-family: Arial, sans-serif; font-size: 10pt; font-weight: bold; color: black; margin-bottom: 8px; text-transform: uppercase; border-left: 3px solid #f97316; padding-left: 8px;">
          RESUMO DAS OBRAS ATIVAS NA SEMANA
        </div>

        <table class="black-grid-table">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="font-weight: bold; text-align: left; width: 35%;">Obra</th>
              <th style="font-weight: bold; text-align: left; width: 25%;">Construtora</th>
              <th style="font-weight: bold; text-align: center; width: 15%;">Progresso</th>
              <th style="font-weight: bold; text-align: center; width: 25%;">Boletim da Semana</th>
            </tr>
          </thead>
          <tbody>
            ${activeWorks.map(work => {
              const logsForWork = state.logs.filter(log => {
                let logDate = new Date(log.timestamp);
                const parsed = parsePeriodDates(log.notes);
                if (parsed) {
                  logDate = parsed.start;
                }
                const logWeekStr = getISOWeekString(logDate);
                return logWeekStr === reportWeek && log.workId === work.id;
              });
              
              const sortedLogs = [...logsForWork].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
              const latestLog = sortedLogs[0];
              const progressVal = latestLog ? latestLog.newProgress : work.progress;
              
              return `
                <tr>
                  <td style="font-weight: bold;">${work.name}</td>
                  <td>${work.contractorName || "N/A"}</td>
                  <td style="text-align: center; font-weight: bold;">${progressVal}%</td>
                  <td style="text-align: center;">
                    ${latestLog 
                      ? `<span style="color: #059669; font-weight: bold;">✔ Registrado</span>` 
                      : `<span style="color: #dc2626; font-style: italic;">Não registrado</span>`
                    }
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
      <div class="page-footer">${currentPage++}</div>
    </div>
  </div>
    `;

    // Subsequent detail pages per active work
    let worksDetailHtml = "";
    activeWorks.forEach(work => {
      const logsForWork = state.logs.filter(log => {
        let logDate = new Date(log.timestamp);
        const parsed = parsePeriodDates(log.notes);
        if (parsed) {
          logDate = parsed.start;
        }
        const logWeekStr = getISOWeekString(logDate);
        return logWeekStr === reportWeek && log.workId === work.id;
      });
      
      const sortedLogs = [...logsForWork].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const log = sortedLogs[0];
      
      const biddingNumber = work.biddingNumber || "39/2022";
      const adminProcess = work.adminProcess || "4200/2022";
      const signingDate = work.signingDate ? formatDate(work.signingDate) : formatDate(work.startDate);
      const publicationDateJom = work.publicationDateJom ? formatDate(work.publicationDateJom) : formatDate(work.startDate);
      const startOrderDate = work.startOrderDate ? formatDate(work.startOrderDate) : formatDate(work.startDate);
      const termDaysVigencia = work.termDaysVigencia || "8 meses";
      const termDaysExecucao = work.termDaysExecucao || "8 meses";
      const parsedValueExtenso = valorParaExtenso(work.biddedValue);
      
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
      }

      if (log) {
        const parsed = parseWeeklyReport(log.notes);
        
        // PAGE 1: FICHA TÉCNICA CONTRATUAL
        worksDetailHtml += `
  <!-- DETALHES CONTRATUAIS - ${work.name} -->
  <div class="page watermark-page border border-slate-100">
    <div class="page-content flex flex-col h-full justify-between">
      <div class="flex-grow my-4 flex flex-col justify-start">
        <div style="background-color: #f97316; border: 0.3mm solid black; border-radius: 0px; padding: 7px 12px; text-align: center; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
          <h2 style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: black; margin: 0; text-transform: uppercase; letter-spacing: 0.1px;">
            ${work.name}
          </h2>
        </div>
        
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
      
      <div class="page-footer">${currentPage++}</div>
    </div>
  </div>

  <!-- PAGE 2: CRONOLOGIA DA OBRA -->
  <div class="page watermark-page border border-slate-100">
    <div class="page-content flex flex-col h-full justify-between">
      <div class="flex-grow my-4 flex flex-col justify-start">
        <div>
          <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest border-l-2 border-orange-500 pl-2">
            CRONOLOGIA DA OBRA — ${work.name}
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
      
      <div class="page-footer">${currentPage++}</div>
    </div>
  </div>

  <!-- PAGE 3: ATIVIDADES DA SEMANA (MEDICAO SEMANAL) -->
  <div class="page watermark-page border border-slate-100">
    <div class="page-content flex flex-col h-full justify-between">
      <div class="flex-grow my-4 flex flex-col justify-start">
        <div style="background-color: #f97316; border: 0.3mm solid black; border-radius: 0px; padding: 6px 10px; text-align: center; margin-bottom: 8px;">
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
      
      <div class="page-footer">${currentPage++}</div>
    </div>
  </div>

  <!-- PAGE 4: REGISTRO FOTOGRÁFICO DE MARCOS (FOTOS DA OBRA) -->
  <div class="page watermark-page border border-slate-100">
    <div class="page-content flex flex-col h-full justify-between">
      <div class="flex-grow my-5 flex flex-col justify-start">
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
      </div>
      
      <div class="page-footer">${currentPage++}</div>
    </div>
  </div>
        `;
      } else {
        // Active work but NO log this week: output a single elegant notification page
        worksDetailHtml += `
  <!-- DETALHE DA OBRA - ${work.name} (Sem Lançamentos) -->
  <div class="page watermark-page border border-slate-100">
    <div class="page-content flex flex-col h-full justify-between">
      <div class="flex-grow my-4 flex flex-col justify-start">
        <div style="background-color: #e2e8f0; border: 0.3mm solid black; border-radius: 0px; padding: 6px 10px; text-align: center; margin-bottom: 20px;">
          <h2 style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: black; margin: 0; text-transform: uppercase;">
            OBRA: ${work.name}
          </h2>
        </div>

        <div style="border: 1px dashed #cbd5e1; padding: 40px; text-align: center; border-radius: 8px; margin-top: 40px; font-family: Calibri, sans-serif; color: #64748b;">
          <div style="font-size: 24pt; margin-bottom: 12px;">📋</div>
          <div style="font-size: 11pt; font-weight: bold; color: #334155; margin-bottom: 8px;">Sem lançamentos registrados para esta obra na semana</div>
          <div style="font-size: 9.5pt;">Esta obra encontra-se ativa no contrato de gerenciamento, mas não recebeu boletins de fiscalização de atividades ou de progresso na semana selecionada (${periodFormatted}).</div>
        </div>
      </div>
      <div class="page-footer">${currentPage++}</div>
    </div>
  </div>
        `;
      }
    });

    const pdfHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Relatorio_Consolidado_Semanal_${reportWeek}</title>
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
        .no-print {
          display: none;
        }
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
        padding: 2px 8px;
        color: #000000;
      }
    </style>
</head>
<body>

  ${coverPageHtml}
  ${summaryPageHtml}
  ${worksDetailHtml}

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
      alert("Habilite permissões para popups no seu navegador para gerar o visualizador de impressão do PDF.");
    }
  };

  const handleLaunchMeasurement = async (
    workId: string,
    newProgress: number,
    notes: string,
    updaterName: string,
    updaterRole: string,
    coverImage?: string,
    progressImages?: string[]
  ) => {
    if (useDirectSupabaseMode) {
      const updatedWorks = state.works.map((w) => {
        if (w.id === workId) {
          return { ...w, progress: newProgress };
        }
        return w;
      });

      const matchedWork = state.works.find((w) => w.id === workId);
      const oldProgress = matchedWork ? matchedWork.progress : 0;
      const workName = matchedWork ? matchedWork.name : "Obra desconhecida";

      const newLog: UpdateLog = {
        id: `log-${Date.now()}`,
        workId,
        workName,
        userName: updaterName,
        userRole: updaterRole,
        timestamp: new Date().toISOString(),
        oldProgress,
        newProgress,
        notes,
        coverImage,
        progressImages
      };

      const newState: DatabaseState = {
        ...state,
        works: updatedWorks,
        logs: [newLog, ...state.logs]
      };
      await saveStateDirect(newState);
      return;
    }

    try {
      const res = await fetch(`/api/works/${workId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progress: newProgress,
          updateNotes: notes,
          updaterName,
          updaterRole,
          coverImage,
          progressImages
        })
      });
      if (!res.ok) throw new Error("Erro ao lançar medição.");
      await loadState();
      setErrorHeader("");
    } catch (err) {
      console.error(err);
      setErrorHeader("Erro ao enviar boletim de medição física.");
    }
  };

  // Update notes of a specific log entry
  const handleUpdateLogNotes = async (logId: string, notes: string) => {
    if (useDirectSupabaseMode) {
      const updatedLogs = state.logs.map((l) => {
        if (l.id === logId) {
          return { ...l, notes };
        }
        return l;
      });

      const newState: DatabaseState = {
        ...state,
        logs: updatedLogs
      };
      await saveStateDirect(newState);
      return;
    }

    try {
      const res = await fetch(`/api/logs/${logId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes })
      });
      if (!res.ok) throw new Error("Erro ao atualizar boletim de medição.");
      await loadState();
      setErrorHeader("");
    } catch (err) {
      console.error(err);
      setErrorHeader("Erro ao salvar alteração do boletim de medição.");
    }
  };

  // Update specific log entry fields (notes, progress, images) and sync work progress if latest
  const handleUpdateLog = async (
    logId: string,
    newProgress: number,
    notes: string,
    coverImage?: string,
    progressImages?: string[]
  ) => {
    if (useDirectSupabaseMode) {
      const updatedLogs = state.logs.map((l) => {
        if (l.id === logId) {
          return { ...l, newProgress, notes, coverImage, progressImages };
        }
        return l;
      });

      const editedLog = state.logs.find((l) => l.id === logId);
      let updatedWorks = state.works;
      if (editedLog) {
        const workLogs = updatedLogs.filter((l) => l.workId === editedLog.workId);
        const sortedLogs = [...workLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (sortedLogs[0]?.id === logId) {
          updatedWorks = state.works.map((w) => {
            if (w.id === editedLog.workId) {
              return { ...w, progress: newProgress };
            }
            return w;
          });
        }
      }

      const newState: DatabaseState = {
        ...state,
        works: updatedWorks,
        logs: updatedLogs
      };
      await saveStateDirect(newState);
      return;
    }

    try {
      const res = await fetch(`/api/logs/${logId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, newProgress, coverImage, progressImages })
      });
      if (!res.ok) throw new Error("Erro ao atualizar lançamento.");
      await loadState();
      setErrorHeader("");
    } catch (err) {
      console.error(err);
      setErrorHeader("Erro ao salvar alteração do lançamento.");
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (useDirectSupabaseMode) {
      const updatedLogs = state.logs.filter((l) => l.id !== logId);
      const newState: DatabaseState = {
        ...state,
        logs: updatedLogs
      };
      await saveStateDirect(newState);
      await loadState();
      return;
    }

    try {
      const res = await fetch(`/api/logs/${logId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Erro ao excluir boletim.");
      await loadState();
      setErrorHeader("");
    } catch (err) {
      console.error(err);
      setErrorHeader("Não foi possível excluir o boletim.");
    }
  };

  // Delete a work entry
  const handleDeleteWork = async (workId: string) => {
    if (useDirectSupabaseMode) {
      const targetWork = state.works.find((w) => w.id === workId);
      const updatedWorks = state.works.filter((w) => w.id !== workId);
      const newLog: UpdateLog = {
        id: `log-${Date.now()}`,
        workId,
        workName: targetWork?.name || "Obra desconhecida",
        userName: activeUser.name,
        userRole: activeUser.role,
        timestamp: new Date().toISOString(),
        oldProgress: targetWork?.progress || 0,
        newProgress: 0,
        notes: `Remoção do registro de obra/lote sob supervisão.`
      };

      const newState: DatabaseState = {
        ...state,
        works: updatedWorks,
        logs: [newLog, ...state.logs]
      };
      await saveStateDirect(newState);
      return;
    }

    try {
      const res = await fetch(`/api/works/${workId}?deleterName=${encodeURIComponent(activeUser.name)}&deleterRole=${encodeURIComponent(activeUser.role)}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Falha ao remover obra.");
      await loadState();
      setErrorHeader("");
    } catch (err) {
      console.error(err);
      setErrorHeader("Não foi possível excluir a obra do servidor.");
    }
  };

  // Move a work up or down in sequence order
  const handleMoveWork = async (workId: string, direction: "up" | "down") => {
    // 1. Map existing works to include numerical orders sequentially
    const sorted = [...state.works].map((w, index) => {
      if (w.order === undefined) {
        return { ...w, order: index };
      }
      return w;
    }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const idx = sorted.findIndex(w => w.id === workId);
    if (idx === -1) return;

    if (direction === "up" && idx > 0) {
      const temp = sorted[idx];
      sorted[idx] = sorted[idx - 1];
      sorted[idx - 1] = temp;
    } else if (direction === "down" && idx < sorted.length - 1) {
      const temp = sorted[idx];
      sorted[idx] = sorted[idx + 1];
      sorted[idx + 1] = temp;
    }

    const updatedWorks = sorted.map((w, i) => ({
      ...w,
      order: i
    }));

    if (useDirectSupabaseMode) {
      const newState: DatabaseState = {
        ...state,
        works: updatedWorks
      };
      await saveStateDirect(newState);
      return;
    }

    try {
      const orderedIds = updatedWorks.map(w => w.id);
      const res = await fetch("/api/works-reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds })
      });
      if (!res.ok) throw new Error("Erro ao reordenar obras no servidor.");
      await loadState();
      setErrorHeader("");
    } catch (err) {
      console.error(err);
      setErrorHeader("Não foi possível salvar a nova ordenação.");
    }
  };

  const handleToggleReorderMode = () => {
    const nextMode = !isReorderMode;
    setIsReorderMode(nextMode);
    if (nextMode) {
      setSortBy("posicao");
    }
  };

  // Add (create) or update a work
  const handleSaveWork = async (workData: Partial<Obra>) => {
    if (useDirectSupabaseMode) {
      const isEditing = !!workData.id;
      let updatedWorks = [...state.works];
      let oldProgress = 0;
      let originalName = workData.name || "Nova Obra";

      if (isEditing) {
        const idx = updatedWorks.findIndex((w) => w.id === workData.id);
        if (idx !== -1) {
          oldProgress = updatedWorks[idx].progress;
          originalName = updatedWorks[idx].name;
          updatedWorks[idx] = { ...updatedWorks[idx], ...workData } as Obra;
        }
      } else {
        const newId = `obra-${Date.now()}`;
        const newObra: Obra = {
          id: newId,
          name: workData.name || "",
          contractNumber: workData.contractNumber || "",
          startDate: workData.startDate || "",
          deadlineDate: workData.deadlineDate || "",
          activeContractDate: workData.activeContractDate || "",
          progress: workData.progress || 0,
          contractorName: workData.contractorName || "",
          biddedValue: workData.biddedValue || 0,
          status: workData.status || "planejamento",
          ...workData
        };
        updatedWorks.push(newObra);
      }

      const actionNotes = isEditing 
        ? ""
        : `Cadastro inicial do lote/obra supervisionada: ${workData.name || ""}.`;

      const newLog: UpdateLog | null = isEditing ? null : {
        id: `log-${Date.now()}`,
        workId: workData.id || `obra-${Date.now()}`,
        workName: originalName,
        userName: activeUser.name,
        userRole: activeUser.role,
        timestamp: new Date().toISOString(),
        oldProgress,
        newProgress: workData.progress || 0,
        notes: actionNotes
      };

      const newState: DatabaseState = {
        ...state,
        works: updatedWorks,
        logs: newLog ? [newLog, ...state.logs] : state.logs
      };
      await saveStateDirect(newState);
      return;
    }

    const isEditing = !!workData.id;
    const url = isEditing ? `/api/works/${workData.id}` : "/api/works";
    const method = isEditing ? "PUT" : "POST";

    const bodyPayload = {
      ...workData,
      creatorName: activeUser.name,
      creatorRole: activeUser.role,
      updaterName: activeUser.name,
      updaterRole: activeUser.role
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload)
    });

    if (!res.ok) throw new Error("Erro ao gravar dados no servidor.");
    await loadState();
    setErrorHeader("");
  };

  // Restore DB values back to original curated state
  const handleResetData = async () => {
    if (useDirectSupabaseMode) {
      await saveStateDirect(DEFAULT_FALLBACK_STATE);
      return;
    }

    try {
      const res = await fetch("/api/contract/reset", { method: "POST" });
      if (!res.ok) throw new Error();
      await loadState(true);
      setErrorHeader("");
    } catch (err) {
      console.error(err);
      setErrorHeader("Não foi possível restaurar os dados.");
    }
  };

  // Process Works: Filter & Sort Client Side
  const filteredWorks = state.works
    .filter((w) => {
      // Search matches name, contractor, status, or contract code
      const q = search.toLowerCase();
      const matchesText =
        w.name.toLowerCase().includes(q) ||
        w.contractNumber.toLowerCase().includes(q) ||
        w.contractorName.toLowerCase().includes(q);

      // Status filter match
      const matchesStatus = statusFilter === "all" || w.status === statusFilter;

      return matchesText && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "posicao":
          return (a.order ?? 0) - (b.order ?? 0);
        case "valorDe":
          return b.biddedValue - a.biddedValue;
        case "valorAt":
          return a.biddedValue - b.biddedValue;
        case "progressoDe":
          return b.progress - a.progress;
        case "progressoAt":
          return a.progress - b.progress;
        case "termino":
          return new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime();
        case "nome":
          return a.name.localeCompare(b.name);
        default:
          return (a.order ?? 0) - (b.order ?? 0);
      }
    });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-stretch" id="applet-root">
      
      {/* Top Application Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs" id="applet-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-xl text-slate-900 shadow-sm animate-pulse-slow flex-shrink-0">
              <Construction className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-600 block leading-none">CODEMAR CT-026/2025</span>
              <h1 className="text-xs sm:text-sm md:text-base font-bold text-slate-800 leading-tight">
                Assessoramento, Gerenciamento, Fiscalização Técnica, Supervisão e Controle de Qualidade de Obras
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Supabase connection status indicator */}
            {state.supabaseStatus && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase font-mono tracking-wider font-extrabold border transition ${
                state.supabaseStatus.connected && state.supabaseStatus.tableExists
                  ? state.supabaseStatus.rlsEnabled
                    ? "bg-amber-100 text-amber-800 border-amber-300 animate-pulse"
                    : "bg-teal-50 text-teal-700 border-teal-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`} title={state.supabaseStatus.error || "Supabase sincronizado com sucesso"}>
                <Cloud className="w-3.5 h-3.5" />
                <span>
                  {state.supabaseStatus.connected && state.supabaseStatus.tableExists
                    ? state.supabaseStatus.rlsEnabled
                      ? "Supabase RLS Blq"
                      : "Supabase OK"
                    : "Supabase Local"}
                </span>
              </div>
            )}

            {/* Sync connection status bubble */}
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold font-mono transition ${
              errorHeader 
                ? "bg-rose-50 text-rose-600 border border-rose-200"
                : isSyncing 
                  ? "bg-amber-50 text-amber-600 border border-amber-200/50" 
                  : "bg-emerald-50 text-emerald-600 border border-emerald-200/50"
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                errorHeader ? "bg-rose-500 animate-ping" : isSyncing ? "bg-amber-500 animate-spin" : "bg-emerald-500"
              }`} />
              <span className="hidden sm:inline">
                {errorHeader ? "Sem rede" : isSyncing ? "Sincronizando..." : "Sincronizado"}
              </span>
            </div>

            <button
              onClick={() => {
                setEditingWork(null);
                setIsModalOpen(true);
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4.5 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              id="add-obra-top-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Obra</span>
            </button>
          </div>
        </div>
      </header>

      {/* Network Alert Band */}
      {errorHeader && (
        <div className="bg-rose-600 text-white text-xs font-semibold py-2 px-4 shadow text-center flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 animate-bounce" />
          <span>{errorHeader}</span>
          <button 
            onClick={() => loadState(true)} 
            className="underline hover:text-rose-100 font-bold ml-2 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Forçar Reconexão
          </button>
        </div>
      )}

      {/* Loading Canvas Gate */}
      {loading ? (
        <main className="flex-grow flex flex-col items-center justify-center p-8 text-slate-500">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
          <p className="text-sm font-semibold">Carregando painel de supervisão...</p>
        </main>
      ) : selectedWorkId && state.works.find((w) => w.id === selectedWorkId) ? (
        <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 flex flex-col items-stretch">
          <WorkDetail
            work={state.works.find((w) => w.id === selectedWorkId)!}
            allLogs={state.logs}
            activeUser={activeUser}
            onBack={() => setSelectedWorkId(null)}
            onUpdateWork={handleSaveWork}
            onEditClick={(w) => {
              setEditingWork(w);
              setIsModalOpen(true);
            }}
            onLaunchMeasurement={handleLaunchMeasurement}
            onUpdateLogNotes={handleUpdateLogNotes}
            onUpdateLog={handleUpdateLog}
            onDeleteLog={handleDeleteLog}
          />
        </main>
      ) : (
        /* Main application Workspace */
        <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 flex flex-col items-stretch">
          
          {/* Section: Contract and Overall Metrics Summary */}
          <ContractOverview
            contractName={state.contractName}
            supervisorCompany={state.supervisorCompany}
            contractValue={state.contractValue}
            contractStartDate={state.contractStartDate}
            contractEndDate={state.contractEndDate}
            contractAdditives={state.contractAdditives}
            works={state.works}
            logs={state.logs}
            onUpdateSettings={handleUpdateSettings}
            reportWeek={reportWeek}
            setReportWeek={setReportWeek}
            onGenerateReport={handleGenerateConsolidatedReport}
          />

          {/* Supabase Status and Table Creation Guidance */}
          {state.supabaseStatus && (!state.supabaseStatus.tableExists || state.supabaseStatus.rlsEnabled || !state.supabaseStatus.connected) && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-4 shadow-xs text-slate-800" id="supabase-guidance">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500 text-slate-900 rounded-xl mt-0.5 shadow-xs">
                  <Database className="w-5 h-5 text-slate-900" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {state.supabaseStatus.rlsEnabled 
                      ? "Ajuste pendente: Desativação do RLS no Supabase" 
                      : "Supabase Conectado! Crie a tabela para ativar a nuvem"}
                  </h3>
                  <p className="text-xs text-slate-655 leading-relaxed">
                    {state.supabaseStatus.rlsEnabled 
                      ? "A sincronização com o Supabase foi interrompida porque o recurso RLS (Row Level Security) está ativo no banco e bloqueou as gravações anônimas."
                      : "Sua conexão com o Supabase foi estabelecida com sucesso. Contudo, a tabela contract_state ainda não foi criada no banco de dados."}
                  </p>
                  <p className="text-xs text-slate-655 leading-relaxed font-semibold">
                    {state.supabaseStatus.rlsEnabled 
                      ? "Para resolver isso e habilitar a gravação instantânea de dados, desative o recurso RLS no painel do Supabase."
                      : "Para habilitar o salvamento em nuvem e a sincronização em tempo real de cards, obras, aditivos e logs no Supabase, certifique-se de que a tabela contract_state esteja criada."}
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-amber-700 font-medium leading-normal">
                Nota: O sistema está atualmente usando o <strong>armazenamento local (database.json)</strong> de forma 100% funcional. Todos os seus salvamentos, criações e exclusões estão sendo mantidos com sucesso! Assim que resolver as permissões de tabela no Supabase, a sincronização em nuvem se tornará ativa automaticamente!
              </div>
            </div>
          )}

          {/* Section: Dashboard interactive filters and sorting */}
          <DashboardFilters
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            activeUser={activeUser}
            onActiveUserChange={setActiveUser}
            onResetData={handleResetData}
          />
          
          {currentUserEmail === "vinicius.martins@quantaconsultoria.com" && (
            <button
              onClick={() => setIsAccessControlOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition"
            >
              <Users className="w-4 h-4" />
              Gerenciar Usuários
            </button>
          )}

          {isAccessControlOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b">
                  <h3 className="font-bold text-slate-800">Gerenciar Usuários</h3>
                  <button onClick={() => setIsAccessControlOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4">
                  <UserAccessControl
                    authorizedUsers={state.authorizedUsers || []}
                    onUpdateAuthorizedUsers={handleUpdateAuthorizedUsers}
                  />
                </div>
              </div>
            </div>
          )}


          {/* Core Content Grid Workspace Split: Left Side Obras, Right Side Updates log */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left Workspace: Works Cards Grid (takes 3 of 3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
                <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-amber-500" />
                  Grade de Obras sob Supervisão
                </h2>
                
                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                  <button
                    onClick={handleToggleReorderMode}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      isReorderMode
                        ? "bg-amber-500 text-slate-900 border-amber-600 shadow-sm"
                        : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                    title="Habilitar botões para reorganizar a sequência das obras"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{isReorderMode ? "Concluir Ordenação" : "Reorganizar Sequência"}</span>
                  </button>
                  <span className="text-xs text-slate-500 font-medium">
                    Exibindo {filteredWorks.length} de {state.works.length} obras
                  </span>
                </div>
              </div>

              {filteredWorks.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-450 space-y-3">
                  <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" />
                  <div>
                    <h3 className="font-bold text-slate-700">Nenhuma obra localizada</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Não há obras que correspondam à busca ou filtro de status selecionado. Ajuste os filtros ou crie uma ficha de obra nova.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingWork(null);
                      setIsModalOpen(true);
                    }}
                    className="mt-2 inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Primeira Obra</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="obras-grid-container">
                  {filteredWorks.map((work) => (
                    <WorkCard
                      key={work.id}
                      work={work}
                      activeUser={activeUser}
                      isReorderMode={isReorderMode}
                      onMoveUp={() => handleMoveWork(work.id, "up")}
                      onMoveDown={() => handleMoveWork(work.id, "down")}
                      onLaunchMeasurement={handleLaunchMeasurement}
                      onEditClick={(w) => {
                        setEditingWork(w);
                        setIsModalOpen(true);
                      }}
                      onDeleteClick={handleDeleteWork}
                      onViewDetail={(w) => setSelectedWorkId(w.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Quick instructions widget card for mobile/browser */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xs">
              <span className="text-[10px] text-amber-400 uppercase tracking-wider font-extrabold block">Instrução Multi-Usuário</span>
              <h4 className="text-xs font-bold font-sans">Simule um Acesso de Outro Navegador!</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed font-light">
                Se você abrir esta aplicação em outra aba do navegador, escolher outro **Perfil Operando Como** na dashboard, e lançar uma medição ou cadastrar uma obra, verá a sincronização automática acontecer nesta aba em tempo real!
              </p>
            </div>

          </div>

        </main>
      )}

      {/* Persistent Applet Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6" id="applet-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-end gap-4 text-xs text-slate-400">
          <div className="flex gap-4">
            <span className="font-mono bg-slate-50 px-2.5 py-1 rounded border border-slate-250">
              Dispositivo: Navegador/Híbrido Mobile
            </span>
            <span className="text-emerald-500 font-semibold flex items-center gap-1">
              ● Banco Cripto-Sincronizado
            </span>
          </div>
        </div>
      </footer>

      {/* Dual interaction form modal overlay */}
      <WorkModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingWork(null);
        }}
        onSave={handleSaveWork}
        editingWork={editingWork}
        activeUser={activeUser}
      />
    </div>
  );
}
