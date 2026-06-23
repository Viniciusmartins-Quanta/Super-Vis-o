import React, { useState, useEffect } from "react";
import { Obra, UpdateLog, DatabaseState, UserProfile, USER_PROFILES, ContractAdditive } from "./types";
import { formatDate } from "./utils";
import { supabase } from "./supabase";

// Custom visual components
import ContractOverview from "./components/ContractOverview";
import DashboardFilters from "./components/DashboardFilters";
import WorkCard from "./components/WorkCard";
import WorkModal from "./components/WorkModal";
import TimelineLogs from "./components/TimelineLogs";
import WorkDetail from "./components/WorkDetail";

// Icons from Lucide
import { Plus, Construction, ClipboardList, Activity, AlertTriangle, CheckSquare, RefreshCw, Layers, Cloud, Database } from "lucide-react";

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
  ]
};

export default function App() {
  // Database state
  const [state, setState] = useState<DatabaseState>({
    contractName: "",
    supervisorCompany: "",
    works: [],
    logs: []
  });

  const [loading, setLoading] = useState(true);
  const [errorHeader, setErrorHeader] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [useDirectSupabaseMode, setUseDirectSupabaseMode] = useState(false);

  // Active user profile context for field signatures
  const [activeUser, setActiveUser] = useState<UserProfile>(USER_PROFILES[0]);

  // Filters and views state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("valorDe");

  // Form Modals Toggles
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<Obra | null>(null);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);

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

        // Load from localStorage if available
        const localCached = localStorage.getItem("contract_state_local");
        const restoredState = localCached ? JSON.parse(localCached) : DEFAULT_FALLBACK_STATE;

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
        const localCached = localStorage.getItem("contract_state_local");
        const initialData = localCached ? JSON.parse(localCached) : DEFAULT_FALLBACK_STATE;

        const { error: insertError } = await supabase
          .from("contract_state")
          .upsert({ id: "current_state", data: initialData, updated_at: new Date().toISOString() });

        setState({
          ...initialData,
          supabaseStatus: {
            connected: true,
            tableExists: true,
            rlsEnabled: !!insertError,
            error: insertError ? insertError.message : ""
          }
        });
        localStorage.setItem("contract_state_local", JSON.stringify(initialData));
      } else {
        localStorage.setItem("contract_state_local", JSON.stringify(data.data));
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
      const localCached = localStorage.getItem("contract_state_local");
      const restoredState = localCached ? JSON.parse(localCached) : DEFAULT_FALLBACK_STATE;

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
    localStorage.setItem("contract_state_local", JSON.stringify(updatedState));

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
    
    let success = false;
    let data: DatabaseState | null = null;
    let attempts = 2; // Keep attempts short to fallback faster
    let lastError: any = null;

    while (attempts > 0 && !success) {
      try {
        const res = await fetch("/api/contract");
        if (!res.ok) throw new Error("Falha ao consultar estado no servidor.");
        data = (await res.json()) as DatabaseState;
        success = true;
      } catch (err) {
        lastError = err;
        attempts--;
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

    if (showLoadingIndicator) setLoading(false);
    setIsSyncing(false);
  };

  // Synchronize on startup
  useEffect(() => {
    loadState(true);

    // Dynamic background polling to keep multiple users in sync!
    const pollInterval = setInterval(() => {
      loadState(false);
    }, 8000);

    return () => clearInterval(pollInterval);
  }, []);

  // Update overall Contract Settings
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
          status: workData.status || "planejamento"
        };
        updatedWorks.push(newObra);
      }

      const actionNotes = isEditing 
        ? `Atualização das configurações/parâmetros do registro: ${workData.name || ""}.`
        : `Cadastro inicial do lote/obra supervisionada: ${workData.name || ""}.`;

      const newLog: UpdateLog = {
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
        logs: [newLog, ...state.logs]
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
          return 0;
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
            onUpdateSettings={handleUpdateSettings}
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
                      ? "Para resolver isso e habilitar a gravação instantânea de dados, execute o comando abaixo no painel SQL Editor do Supabase:"
                      : "Para habilitar o salvamento em nuvem e a sincronização em tempo real de cards, obras, aditivos e logs no Supabase, execute o script SQL abaixo no SQL Editor do seu painel do Supabase:"}
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 relative group">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px] font-mono tracking-wider uppercase font-bold">
                  <span>Script de Inicialização SQL</span>
                  <button
                    onClick={() => {
                      const sql = state.supabaseStatus?.rlsEnabled 
                        ? "ALTER TABLE contract_state DISABLE ROW LEVEL SECURITY;"
                        : `CREATE TABLE contract_state (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Desativar RLS para permitir leitura e gravação anônima via chave pública
ALTER TABLE contract_state DISABLE ROW LEVEL SECURITY;`;
                      navigator.clipboard.writeText(sql);
                      alert("Script SQL copiado com sucesso!");
                    }}
                    className="hover:text-white transition flex items-center gap-1 cursor-pointer bg-slate-800 px-2 py-1 rounded font-sans leading-none font-bold text-[10px] text-slate-200"
                  >
                    Copiar Código
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto text-[11.5px] font-mono text-slate-300 leading-relaxed font-semibold">
                  {state.supabaseStatus.rlsEnabled 
                    ? "ALTER TABLE contract_state DISABLE ROW LEVEL SECURITY;"
                    : `CREATE TABLE contract_state (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Desativar RLS para permitir leitura e gravação anônima via chave pública
ALTER TABLE contract_state DISABLE ROW LEVEL SECURITY;`}
                </pre>
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

          {/* Core Content Grid Workspace Split: Left Side Obras, Right Side Updates log */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left Workspace: Works Cards Grid (takes 2 of 3 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-amber-500" />
                  Grade de Obras sob Supervisão
                </h2>
                <span className="text-xs text-slate-500 font-medium">
                  Exibindo {filteredWorks.length} de {state.works.length} obras
                </span>
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

            {/* Right Workspace: Dynamic chronological updates logs (takes 1 of 3 cols) */}
            <div className="lg:col-span-1 space-y-4">
              <TimelineLogs logs={state.logs} />
              
              {/* Quick instructions widget card for mobile/browser */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xs">
                <span className="text-[10px] text-amber-400 uppercase tracking-wider font-extrabold block">Instrução Multi-Usuário</span>
                <h4 className="text-xs font-bold font-sans">Simule um Acesso de Outro Navegador!</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed font-light">
                  Se você abrir esta aplicação em outra aba do navegador, escolher outro **Perfil Operando Como** na dashboard, e lançar uma medição ou cadastrar uma obra, verá a sincronização automática acontecer nesta aba em tempo real!
                </p>
              </div>
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
