import React, { useState, useEffect, useRef } from "react";
import {
  Database,
  Obra,
  UpdateLog,
  UserProfile,
  ContractAdditive,
} from "./types";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Settings,
  Plus,
  Search,
  Trash2,
  Edit,
  MessageSquare,
  Send,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Coins,
  Clock,
  ArrowRight,
  Bot,
  Database as DbIcon,
  Calendar,
  Sparkles,
  Menu,
  X,
  UserCheck,
  ChevronRight,
  Building,
} from "lucide-react";
import { formatCurrency, formatDate, parseWeeklyReport } from "./utils";
import ActivityModal from "./components/ActivityModal";
import WorkFormModal from "./components/WorkFormModal";

// Default Supervisor Profile
const defaultUser: UserProfile = {
  name: "Eng. Vinícius Martins",
  role: "Fiscal Supervisor",
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "obras" | "boletins" | "config">("dashboard");
  const [contractData, setContractData] = useState<Database & { supabaseStatus?: any } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeUser, setActiveUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("supervisor_profile");
    return saved ? JSON.parse(saved) : defaultUser;
  });

  // UI Modals and Sidebar Control States
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [selectedWorkForActivity, setSelectedWorkForActivity] = useState<Obra | null>(null);
  const [selectedLogForEdit, setSelectedLogForEdit] = useState<UpdateLog | null>(null);

  const [isWorkFormOpen, setIsWorkFormOpen] = useState(false);
  const [selectedWorkForEdit, setSelectedWorkForEdit] = useState<Obra | null>(null);

  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    {
      sender: "ai",
      text: "Olá! Sou o Assistente de Inteligência Artificial da Supervisão de Obras. Posso analisar o progresso dos contratos, redigir minutas de boletins ou alertar sobre prazos. Como posso ajudar?",
    },
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Lightbox view for images
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Profile Edit Mode
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState(activeUser.name);
  const [profileRoleInput, setProfileRoleInput] = useState(activeUser.role);

  // Fetch initial contract data
  const loadContractData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/contract");
      if (!res.ok) throw new Error("Erro ao obter dados do servidor.");
      const data = await res.json();
      setContractData(data);
    } catch (err) {
      console.error("Falha ao carregar contrato:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContractData();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, isAiOpen]);

  // Profile management
  const handleSaveProfile = () => {
    const updated = { name: profileNameInput, role: profileRoleInput };
    setActiveUser(updated);
    localStorage.setItem("supervisor_profile", JSON.stringify(updated));
    setIsEditingProfile(false);
  };

  // Submit new activity/measurement report
  const handleSubmittingActivity = async (
    workId: string,
    newProgress: number,
    notes: string,
    updaterName: string,
    updaterRole: string,
    coverImage?: string,
    progressImages?: string[]
  ) => {
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
          progressImages,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao registrar atividade.");
      }

      await loadContractData();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
      throw err;
    }
  };

  // Update existing log report
  const handleUpdatingActivity = async (
    logId: string,
    newProgress: number,
    notes: string,
    coverImage?: string,
    progressImages?: string[]
  ) => {
    try {
      const res = await fetch(`/api/logs/${logId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          newProgress,
          coverImage,
          progressImages,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao atualizar relatório.");
      }

      await loadContractData();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
      throw err;
    }
  };

  // Delete Log Bulletin
  const handleDeleteLog = async (logId: string) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente este boletim semanal?")) return;
    try {
      const res = await fetch(`/api/logs/${logId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir boletim.");
      await loadContractData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Submit add or edit work
  const handleWorkFormSubmit = async (workData: Partial<Obra>) => {
    try {
      const isEdit = !!selectedWorkForEdit;
      const url = isEdit ? `/api/works/${selectedWorkForEdit.id}` : "/api/works";
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        ...workData,
        creatorName: activeUser.name,
        creatorRole: activeUser.role,
        updaterName: activeUser.name,
        updaterRole: activeUser.role,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao gravar dados da obra.");
      }

      await loadContractData();
      setSelectedWorkForEdit(null);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // Delete work completely
  const handleDeleteWork = async (workId: string) => {
    if (
      !confirm(
        "ATENÇÃO: Excluir esta obra pública também removerá todos os seus registros de histórico. Deseja prosseguir?"
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `/api/works/${workId}?deleterName=${encodeURIComponent(activeUser.name)}&deleterRole=${encodeURIComponent(
          activeUser.role
        )}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Erro ao excluir obra.");
      await loadContractData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Update Contract settings
  const handleUpdateContractSettings = async (settings: Partial<Database>) => {
    try {
      const res = await fetch("/api/contract/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Falha ao atualizar configurações de contrato.");
      await loadContractData();
      alert("Contrato atualizado com sucesso!");
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Reset database back to original template
  const handleResetDatabase = async () => {
    if (!confirm("Isso redefinirá todas as obras e boletins de medição para a configuração inicial do DER/PR. Confirmar?")) {
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/contract/reset", { method: "POST" });
      if (!res.ok) throw new Error("Erro ao resetar banco.");
      const data = await res.json();
      setContractData(data.data);
      alert("Banco restaurado com sucesso!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // AI Chat Request handler
  const handleSendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMessage.trim()) return;

    const userText = aiMessage;
    setAiMessage("");
    setChatHistory((prev) => [...prev, { sender: "user", text: userText }]);
    setIsAiLoading(true);

    try {
      // Build a contextual prompt using our current contract state
      const worksSummary = contractData?.works
        .map((w) => `Obra: "${w.name}" (CTR: ${w.contractNumber}, Progresso: ${w.progress}%, Status: ${w.status}, Empreiteira: ${w.contractorName}, Valor: R$ ${w.biddedValue.toLocaleString("pt-BR")})`)
        .join("\n");

      const promptContext = `
Você é o assistente virtual inteligente especialista em engenharia civil e fiscalização da Quanta Consultoria.
Você está prestando suporte no painel do contrato: "${contractData?.contractName || ""}".
O fiscal ativo é ${activeUser.name} (${activeUser.role}).

Abaixo estão os dados reais das obras públicas cadastradas no contrato:
${worksSummary || "Nenhuma cadastrada no momento."}

Responda à seguinte mensagem do usuário de forma clara, técnica, prestativa e estritamente profissional em português. Se solicitado, ajude a redigir boletins diários de acompanhamento, analisar atrasos com base nas datas oficiais ou sugerir ações de supervisão.

Mensagem do usuário:
"${userText}"
      `.trim();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagemDoUsuario: promptContext }),
      });

      if (!res.ok) throw new Error("Falha ao comunicar com o servidor Gemini.");
      const data = await res.json();

      setChatHistory((prev) => [...prev, { sender: "ai", text: data.respostaDaIA || "Sem resposta." }]);
    } catch (err: any) {
      console.error(err);
      setChatHistory((prev) => [
        ...prev,
        {
          sender: "ai",
          text: `Erro ao obter resposta do Gemini: ${err.message}. Certifique-se de que a chave GEMINI_API_KEY está configurada.`,
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Calculations for KPI Summary Bento cards
  const totalValue = contractData?.works.reduce((acc, w) => acc + (w.biddedValue || 0), 0) || 0;
  const contractBudget = contractData?.contractValue || 3450000;
  const averageProgress = contractData?.works.length
    ? Math.round(contractData.works.reduce((acc, w) => acc + w.progress, 0) / contractData.works.length)
    : 0;

  const ongoingCount = contractData?.works.filter((w) => w.status === "em_andamento").length || 0;
  const haltedCount = contractData?.works.filter((w) => w.status === "paralisada").length || 0;
  const completedCount = contractData?.works.filter((w) => w.status === "concluida").length || 0;
  const plannedCount = contractData?.works.filter((w) => w.status === "planejamento").length || 0;

  // Filtered works for listing
  const filteredWorks = (contractData?.works || []).filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.contractorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.contractNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Navbar Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-md">
              <Building className="w-5.5 h-5.5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded tracking-wider">
                  Fiscalização DER-PR
                </span>
                {contractData?.supabaseStatus?.connected ? (
                  <span className="text-[10px] bg-emerald-500 text-slate-950 font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-950 rounded-full animate-ping" />
                    Supabase Conectado
                  </span>
                ) : (
                  <span className="text-[10px] bg-rose-500 text-white font-extrabold px-1.5 py-0.5 rounded" title={contractData?.supabaseStatus?.error}>
                    Modo Local (Sem BD)
                  </span>
                )}
              </div>
              <h1 className="text-sm font-black text-slate-100 tracking-tight mt-0.5">
                {contractData?.contractName || "Carregando Contrato..."}
              </h1>
            </div>
          </div>

          {/* Active User Widget with Edit option */}
          <div className="flex items-center gap-3 bg-slate-800/60 p-2 rounded-xl border border-slate-700/60">
            <UserCheck className="w-5 h-5 text-amber-400" />
            {isEditingProfile ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={profileNameInput}
                  onChange={(e) => setProfileNameInput(e.target.value)}
                  className="bg-slate-700 text-white text-xs px-2 py-1 rounded max-w-[120px] outline-none"
                  placeholder="Nome"
                />
                <input
                  type="text"
                  value={profileRoleInput}
                  onChange={(e) => setProfileRoleInput(e.target.value)}
                  className="bg-slate-700 text-white text-xs px-2 py-1 rounded max-w-[120px] outline-none"
                  placeholder="Cargo"
                />
                <button
                  onClick={handleSaveProfile}
                  className="text-[10px] font-bold bg-amber-500 text-slate-950 px-2 py-1 rounded cursor-pointer hover:bg-amber-400"
                >
                  Ok
                </button>
              </div>
            ) : (
              <div className="text-right">
                <div className="text-xs font-black text-slate-200 flex items-center justify-end gap-1">
                  <span>{activeUser.name}</span>
                  <button
                    onClick={() => {
                      setProfileNameInput(activeUser.name);
                      setProfileRoleInput(activeUser.role);
                      setIsEditingProfile(true);
                    }}
                    className="text-[10px] text-amber-400 hover:underline hover:text-amber-300 ml-1 cursor-pointer"
                  >
                    (editar)
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 font-bold">{activeUser.role}</div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Layer */}
      <div className="flex-grow flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        
        {/* Navigation Left Rail / Sidebar */}
        <aside className="w-full md:w-60 shrink-0 flex flex-col gap-3">
          <nav className="bg-white rounded-2xl border border-slate-200 p-3 shadow-3xs flex flex-row md:flex-col gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline md:inline">Painel Geral</span>
            </button>

            <button
              onClick={() => setActiveTab("obras")}
              className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                activeTab === "obras"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline md:inline">Obras Públicas</span>
            </button>

            <button
              onClick={() => setActiveTab("boletins")}
              className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                activeTab === "boletins"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline md:inline">Boletins de Medição</span>
            </button>

            <button
              onClick={() => setActiveTab("config")}
              className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                activeTab === "config"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline md:inline">Configurações</span>
            </button>
          </nav>

          {/* Quick AI Trigger Box */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 border border-slate-700 shadow-md flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-amber-400 animate-bounce-slow" />
              <h4 className="text-xs font-black tracking-wide text-amber-400 uppercase">
                Análise com Gemini AI
              </h4>
            </div>
            <p className="text-[11px] text-slate-350 leading-relaxed font-medium">
              Analise instantaneamente relatórios, aditivos e gere alertas inteligentes para o fiscal.
            </p>
            <button
              onClick={() => setIsAiOpen(true)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Abrir Assistente IA</span>
            </button>
          </div>
        </aside>

        {/* Dynamic Center Work Area */}
        <main className="flex-grow flex flex-col min-w-0">
          
          {isLoading ? (
            <div className="flex-grow flex flex-col items-center justify-center bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-3xs">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
              <p className="text-xs font-bold text-slate-500">Sincronizando base de dados com o Supabase...</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* VIEW: DASHBOARD */}
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  
                  {/* General Contract Overview Bento Header */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs relative overflow-hidden">
                    <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">
                          Supervisora Responsável
                        </span>
                        <h2 className="text-lg font-black text-slate-800 mt-0.5">
                          {contractData?.supervisorCompany || "Quanta Consultoria e Engenharia"}
                        </h2>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-slate-500 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Coins className="w-4 h-4 text-slate-400" />
                            Contrato: {formatCurrency(contractBudget)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            Vigência: {formatDate(contractData?.contractStartDate)} a {formatDate(contractData?.contractEndDate)}
                          </span>
                        </div>
                      </div>

                      {contractData?.contractAdditives && contractData.contractAdditives.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs max-w-xs">
                          <span className="font-extrabold text-amber-800 block">
                            Aditivos de Supervisão ({contractData.contractAdditives.length})
                          </span>
                          <span className="text-[11px] text-amber-700 font-medium block mt-1">
                            Prorrogações de prazo e acréscimo de serviços para supervisão técnica.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bento Grid Summary Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Stat Card 1: Works Budget */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-3xs flex flex-col gap-1 relative overflow-hidden">
                      <div className="p-2 bg-amber-100 rounded-xl w-fit text-amber-600">
                        <Coins className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-2">
                        Investimento em Obras
                      </span>
                      <span className="text-base font-black text-slate-800 font-mono tracking-tight">
                        {formatCurrency(totalValue)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                        Soma dos contratos licitados
                      </span>
                    </div>

                    {/* Stat Card 2: Average Physical Progress */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-3xs flex flex-col gap-1 relative overflow-hidden">
                      <div className="p-2 bg-emerald-100 rounded-xl w-fit text-emerald-600">
                        <TrendingUp className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-2">
                        Média de Progresso Físico
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-black text-slate-800 font-mono tracking-tight">
                          {averageProgress}%
                        </span>
                        <span className="text-xs font-extrabold text-emerald-600">Geral</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${averageProgress}%` }} />
                      </div>
                    </div>

                    {/* Stat Card 3: Total works and split */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-3xs flex flex-col gap-1 relative overflow-hidden">
                      <div className="p-2 bg-indigo-100 rounded-xl w-fit text-indigo-600">
                        <Briefcase className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-2">
                        Obras sob Supervisão
                      </span>
                      <span className="text-base font-black text-slate-800 font-mono tracking-tight">
                        {contractData?.works.length || 0} Obras
                      </span>
                      <span className="text-[10px] text-slate-450 font-bold block mt-1">
                        {ongoingCount} Ativas | {haltedCount} Paradas | {completedCount} Prontas
                      </span>
                    </div>

                    {/* Stat Card 4: Last Measurement Bulletin */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-3xs flex flex-col gap-1 relative overflow-hidden">
                      <div className="p-2 bg-purple-100 rounded-xl w-fit text-purple-600">
                        <FileText className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-2">
                        Boletins Enviados
                      </span>
                      <span className="text-base font-black text-slate-800 font-mono tracking-tight">
                        {contractData?.logs.length || 0} Boletins
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        Último: {contractData?.logs[0] ? formatDate(contractData.logs[0].timestamp.split("T")[0]) : "Nenhum ainda"}
                      </span>
                    </div>

                  </div>

                  {/* Core Dashboard Row: Progress of each work + Latest Bulletins */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left Column (8/12) - Works list card tracking progress */}
                    <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-3xs overflow-hidden flex flex-col">
                      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                          <TrendingUp className="w-4.5 h-4.5 text-amber-500 animate-pulse-slow" />
                          <span>Status do Avanço das Obras</span>
                        </h3>
                        <button
                          onClick={() => setActiveTab("obras")}
                          className="text-[11px] font-extrabold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Ver todas
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="p-6 divide-y divide-slate-100 flex-grow">
                        {contractData?.works && contractData.works.length > 0 ? (
                          contractData.works.map((work) => (
                            <div key={work.id} className="py-4 first:pt-0 last:pb-0 flex flex-col gap-2">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                                <span className="hover:text-amber-600 transition truncate pr-4">{work.name}</span>
                                <span className="font-mono font-black">{work.progress}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-500 ${
                                    work.status === "em_andamento"
                                      ? "bg-amber-500"
                                      : work.status === "concluida"
                                      ? "bg-emerald-500"
                                      : work.status === "paralisada"
                                      ? "bg-rose-500"
                                      : "bg-slate-400"
                                  }`}
                                  style={{ width: `${work.progress}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                                <span className="capitalize">{work.status.replace("_", " ")}</span>
                                <span>Licitado: {formatCurrency(work.biddedValue)}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-slate-400">Nenhuma obra cadastrada.</div>
                        )}
                      </div>
                    </div>

                    {/* Right Column (5/12) - Latest Bulletins Feed */}
                    <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-3xs overflow-hidden flex flex-col">
                      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                          <FileText className="w-4.5 h-4.5 text-amber-500" />
                          <span>Boletins Recentes</span>
                        </h3>
                        <button
                          onClick={() => setActiveTab("boletins")}
                          className="text-[11px] font-extrabold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Histórico
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="p-5 space-y-4 flex-grow overflow-y-auto max-h-[350px]">
                        {contractData?.logs && contractData.logs.length > 0 ? (
                          contractData.logs.slice(0, 3).map((log) => (
                            <div key={log.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col gap-1 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-800 block truncate max-w-[140px]">
                                  {log.workName}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {formatDate(log.timestamp.split("T")[0])}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-0.5">
                                <span>Por: {log.userName}</span>
                                <span>({log.userRole})</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 bg-white p-1.5 rounded-lg border border-slate-200/60 w-fit text-[11px]">
                                <span className="font-bold text-slate-400 font-mono">Avanço:</span>
                                <span className="font-extrabold text-slate-800 font-mono">
                                  {log.oldProgress}% → {log.newProgress}%
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-slate-400">Nenhum boletim semanal lançado.</div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* VIEW: OBRAS PÚBLICAS */}
              {activeTab === "obras" && (
                <div className="space-y-6">
                  
                  {/* Search and action bar */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-3xs flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                      
                      {/* Search Input */}
                      <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 text-slate-450 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Buscar obra, empreiteira..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                        />
                      </div>

                      {/* Filter Select */}
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs w-full sm:w-auto focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="all">Todos os Status</option>
                        <option value="planejamento">Planejamento</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="paralisada">Paralisada</option>
                        <option value="concluida">Concluída</option>
                      </select>

                    </div>

                    <button
                      onClick={() => {
                        setSelectedWorkForEdit(null);
                        setIsWorkFormOpen(true);
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-3xs w-full sm:w-auto cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nova Obra Pública</span>
                    </button>
                  </div>

                  {/* Works Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredWorks.length > 0 ? (
                      filteredWorks.map((work) => (
                        <div
                          key={work.id}
                          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-3xs flex flex-col hover:shadow-2xs transition"
                        >
                          {/* Card Header with Status and title */}
                          <div className="p-5 pb-4 border-b border-slate-100 flex flex-col gap-1.5 relative">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-wider font-mono text-slate-400">
                                Contrato: {work.contractNumber}
                              </span>
                              
                              {/* Status Badges */}
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full capitalize ${
                                  work.status === "em_andamento"
                                    ? "bg-amber-100 text-amber-800"
                                    : work.status === "concluida"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : work.status === "paralisada"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-slate-150 text-slate-700"
                                }`}
                              >
                                {work.status.replace("_", " ")}
                              </span>
                            </div>

                            <h3 className="text-sm font-black text-slate-800 leading-snug line-clamp-2 pr-6">
                              {work.name}
                            </h3>
                          </div>

                          {/* Info Body */}
                          <div className="p-5 py-4 flex-grow space-y-4 text-xs font-semibold text-slate-600">
                            
                            {/* Contractor Name */}
                            <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                              <span className="text-slate-450 text-[11px]">Executora:</span>
                              <span className="text-slate-750 font-bold truncate max-w-[180px]">
                                {work.contractorName}
                              </span>
                            </div>

                            {/* Value and Timeline dates */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="block text-[10px] text-slate-400 uppercase font-bold">
                                  Valor Licitado
                                </span>
                                <span className="font-mono font-black text-slate-800">
                                  {formatCurrency(work.biddedValue)}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[10px] text-slate-400 uppercase font-bold">
                                  Término Oficial
                                </span>
                                <span className="font-medium text-slate-700">
                                  {formatDate(work.deadlineDate)}
                                </span>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                                <span>Avanço Físico Concluído</span>
                                <span className="font-mono font-black text-slate-800">{work.progress}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-500 ${
                                    work.status === "em_andamento"
                                      ? "bg-amber-500"
                                      : work.status === "concluida"
                                      ? "bg-emerald-500"
                                      : work.status === "paralisada"
                                      ? "bg-rose-500"
                                      : "bg-slate-400"
                                  }`}
                                  style={{ width: `${work.progress}%` }}
                                />
                              </div>
                            </div>

                            {/* Technical Expanded Specs List */}
                            <details className="text-[11px] text-slate-500 space-y-1.5 pt-2 border-t border-slate-100 cursor-pointer group select-none">
                              <summary className="font-extrabold text-slate-550 hover:text-slate-800 flex items-center gap-1 focus:outline-none">
                                <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
                                <span>Especificações Técnicas (Admins)</span>
                              </summary>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-4 pt-1.5 border-l border-slate-150 text-[10px] bg-slate-50/60 p-2 rounded-lg font-medium">
                                <div>
                                  <span className="block text-slate-400 font-bold">EDITAL LICITAÇÃO:</span>
                                  <span className="text-slate-700 font-semibold">{work.biddingNumber || "-"}</span>
                                </div>
                                <div>
                                  <span className="block text-slate-400 font-bold">PROC. ADMIN:</span>
                                  <span className="text-slate-700 font-semibold">{work.adminProcess || "-"}</span>
                                </div>
                                <div>
                                  <span className="block text-slate-400 font-bold">PRAZO VIGÊNCIA:</span>
                                  <span className="text-slate-700 font-semibold">{work.termDaysVigencia || "-"}</span>
                                </div>
                                <div>
                                  <span className="block text-slate-400 font-bold">PRAZO EXECUÇÃO:</span>
                                  <span className="text-slate-700 font-semibold">{work.termDaysExecucao || "-"}</span>
                                </div>
                                <div>
                                  <span className="block text-slate-400 font-bold">ASSINATURA CTR:</span>
                                  <span className="text-slate-700 font-semibold">{formatDate(work.signingDate)}</span>
                                </div>
                                <div>
                                  <span className="block text-slate-400 font-bold">ORDEM DE SERVIÇO:</span>
                                  <span className="text-slate-700 font-semibold">{formatDate(work.startOrderDate)}</span>
                                </div>
                              </div>
                            </details>

                          </div>

                          {/* Action Buttons Footer */}
                          <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2.5">
                            
                            {/* Launch weekly measurement report button */}
                            <button
                              onClick={() => {
                                setSelectedWorkForActivity(work);
                                setSelectedLogForEdit(null); // creation mode
                                setIsActivityOpen(true);
                              }}
                              className="flex-grow bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-extrabold py-2 px-3 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Lançar Boletim</span>
                            </button>

                            {/* Edit Work button */}
                            <button
                              onClick={() => {
                                setSelectedWorkForEdit(work);
                                setIsWorkFormOpen(true);
                              }}
                              className="bg-white hover:bg-slate-100 text-slate-650 border border-slate-200 font-bold p-2 rounded-xl transition cursor-pointer"
                              title="Editar Informações Técnicas"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete work button */}
                            <button
                              onClick={() => handleDeleteWork(work.id)}
                              className="bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 font-bold p-2 rounded-xl transition cursor-pointer"
                              title="Excluir Obra"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-1 md:col-span-2 text-center py-12 bg-white border border-slate-200 rounded-2xl p-8 text-slate-400">
                        Nenhuma obra pública encontrada correspondente aos filtros.
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* VIEW: BOLETINS SEMANAIS HISTÓRICO */}
              {activeTab === "boletins" && (
                <div className="space-y-6">
                  
                  {/* Bulletins Feed list */}
                  <div className="space-y-6">
                    {contractData?.logs && contractData.logs.length > 0 ? (
                      contractData.logs.map((log) => {
                        const parsed = parseWeeklyReport(log.notes);
                        const workRef = contractData.works.find((w) => w.id === log.workId);

                        return (
                          <div
                            key={log.id}
                            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-3xs flex flex-col"
                          >
                            
                            {/* Feed Item Header */}
                            <div className="p-5 pb-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <span className="text-[10px] bg-slate-800 text-slate-100 font-extrabold px-2 py-0.5 rounded">
                                  {log.workName}
                                </span>
                                <div className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5 mt-1.5">
                                  <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Por: <span className="text-slate-600 font-extrabold">{log.userName}</span></span>
                                  <span className="text-slate-300">|</span>
                                  <span>Role: {log.userRole}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-[11px] text-slate-400 font-mono font-bold">
                                  {formatDate(log.timestamp.split("T")[0])}
                                </span>
                                
                                {/* Progress change indicator */}
                                <div className="bg-slate-900 text-white font-mono text-xs font-black py-1 px-2.5 rounded-lg flex items-center gap-1.5">
                                  <span className="text-[9px] text-slate-400 uppercase font-sans">Avanço:</span>
                                  <span>{log.oldProgress}%</span>
                                  <ArrowRight className="w-3 h-3 text-amber-400" />
                                  <span className="text-amber-400">{log.newProgress}%</span>
                                </div>
                              </div>
                            </div>

                            {/* Feed Item Content Section */}
                            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                              
                              {/* Left detail area: Report text parsed */}
                              <div className="lg:col-span-8 space-y-4">
                                {parsed.isWeeklyReport ? (
                                  <div className="space-y-4 text-xs">
                                    
                                    {/* Report Title Headline & Period */}
                                    <div className="border-b border-slate-100 pb-2">
                                      <h4 className="text-xs font-black text-slate-800">
                                        {parsed.title}
                                      </h4>
                                      {parsed.period && (
                                        <p className="text-[11px] text-slate-500 font-bold mt-1">
                                          Período: {parsed.period}
                                        </p>
                                      )}
                                    </div>

                                    {/* Structured Key Values details list */}
                                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                      <div>
                                        <span className="text-[9px] text-slate-400 uppercase font-extrabold">Situação do Aditivo</span>
                                        <span className="block font-bold text-slate-700 mt-0.5">{parsed.aditivoStatus || "N/A"}</span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] text-slate-400 uppercase font-extrabold">Infraestrutura de Dados</span>
                                        <span className="block font-bold text-slate-700 mt-0.5">{parsed.infraStatus || "N/A"}</span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] text-slate-400 uppercase font-extrabold">Aumento Carga (ENEL)</span>
                                        <span className="block font-bold text-slate-700 mt-0.5">{parsed.enelStatus || "N/A"}</span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] text-slate-400 uppercase font-extrabold">Subestação Elétrica</span>
                                        <span className="block font-bold text-slate-700 mt-0.5">{parsed.substationStatus || "N/A"}</span>
                                      </div>
                                      {parsed.relevantInfo && parsed.relevantInfo !== "N/A" && (
                                        <div className="col-span-2 border-t border-slate-100 pt-2">
                                          <span className="text-[9px] text-slate-400 uppercase font-extrabold">Informação Relevante</span>
                                          <span className="block font-semibold text-slate-700 mt-0.5">{parsed.relevantInfo}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Activities realized this week */}
                                    <div className="space-y-1">
                                      <span className="text-[11px] font-black text-slate-750 flex items-center gap-1 uppercase tracking-wide">
                                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                        <span>Atividades Realizadas na Semana</span>
                                      </span>
                                      <ul className="space-y-1 pl-3.5">
                                        {parsed.weeklyActivities.map((act, i) => (
                                          <li key={i} className="text-[11px] text-slate-600 list-disc leading-relaxed font-semibold">
                                            {act}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>

                                    {/* Activities next week */}
                                    <div className="space-y-1">
                                      <span className="text-[11px] font-black text-slate-750 flex items-center gap-1 uppercase tracking-wide">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                        <span>Planejamento para Próxima Semana</span>
                                      </span>
                                      <ul className="space-y-1 pl-3.5">
                                        {parsed.nextWeekActivities.map((act, i) => (
                                          <li key={i} className="text-[11px] text-slate-600 list-disc leading-relaxed font-semibold">
                                            {act}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>

                                    {/* Important findings or observations */}
                                    {parsed.importantNotes.length > 0 && (
                                      <div className="space-y-1">
                                        <span className="text-[11px] font-black text-rose-700 flex items-center gap-1 uppercase tracking-wide">
                                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                          <span>Apontamentos e Observações Importantes</span>
                                        </span>
                                        <ul className="space-y-1 pl-3.5">
                                          {parsed.importantNotes.map((act, i) => (
                                            <li key={i} className="text-[11px] text-rose-750 list-disc leading-relaxed font-bold">
                                              {act}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                  </div>
                                ) : (
                                  // Raw markdown or simple logs display
                                  <p className="text-xs text-slate-650 leading-relaxed font-medium whitespace-pre-line">
                                    {log.notes}
                                  </p>
                                )}
                              </div>

                              {/* Right detail area (4/12) - Report Attached photos */}
                              <div className="lg:col-span-4 space-y-4">
                                <div className="space-y-3">
                                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">
                                    Anexos Fotográficos
                                  </span>
                                  
                                  {/* Cover image thumbnail */}
                                  {log.coverImage ? (
                                    <div className="relative rounded-xl overflow-hidden border border-slate-200/60 shadow-3xs group max-w-sm">
                                      <img
                                        src={log.coverImage}
                                        alt="Capa do relatório"
                                        className="w-full h-32 object-cover cursor-pointer hover:scale-103 transition duration-200"
                                        onClick={() => setLightboxImage(log.coverImage!)}
                                      />
                                      <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                                        Capa da Semana
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="h-14 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl flex items-center justify-center text-[10px] text-slate-400 font-medium italic">
                                      Nenhuma foto de capa cadastrada.
                                    </div>
                                  )}

                                  {/* Progress grid images thumbnails */}
                                  {log.progressImages && log.progressImages.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2">
                                      {log.progressImages.map((imgUrl, idx) => (
                                        <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200 shadow-3xs group h-18 bg-slate-100">
                                          <img
                                            src={imgUrl}
                                            alt={`Progresso ${idx + 1}`}
                                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                                            onClick={() => setLightboxImage(imgUrl)}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="h-14 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl flex items-center justify-center text-[10px] text-slate-400 font-medium italic">
                                      Nenhuma foto de progresso cadastrada.
                                    </div>
                                  )}

                                </div>
                              </div>

                            </div>

                            {/* Actions for Bulletin Logs */}
                            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                              
                              {/* Edit Bulletin button */}
                              <button
                                onClick={() => {
                                  if (!workRef) {
                                    alert("Obra correspondente a este boletim foi excluída.");
                                    return;
                                  }
                                  setSelectedWorkForActivity(workRef);
                                  setSelectedLogForEdit(log); // edit mode
                                  setIsActivityOpen(true);
                                }}
                                className="text-[11px] font-extrabold text-slate-600 hover:text-amber-600 flex items-center gap-1 cursor-pointer transition"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Editar Notas</span>
                              </button>

                              {/* Delete Bulletin button */}
                              <button
                                onClick={() => handleDeleteLog(log.id)}
                                className="text-[11px] font-extrabold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir Boletim</span>
                              </button>

                            </div>

                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl p-8 text-slate-400">
                        Nenhum boletim semanal lançado até o momento.
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* VIEW: CONFIGURAÇÕES */}
              {activeTab === "config" && (
                <div className="space-y-6">
                  
                  {/* Edit Contract Main Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-6">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                      Ficha do Contrato de Supervisão do DER-PR
                    </h3>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        handleUpdateContractSettings({
                          contractName: String(formData.get("contractName")),
                          supervisorCompany: String(formData.get("supervisorCompany")),
                          contractValue: Number(formData.get("contractValue")),
                          contractStartDate: String(formData.get("contractStartDate")),
                          contractEndDate: String(formData.get("contractEndDate")),
                        });
                      }}
                      className="space-y-4 text-xs font-semibold"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Nome do Contrato de Supervisão (Ficha Principal)
                          </label>
                          <input
                            type="text"
                            name="contractName"
                            required
                            defaultValue={contractData?.contractName}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Consórcio / Empresa Supervisora Responsável
                          </label>
                          <input
                            type="text"
                            name="supervisorCompany"
                            required
                            defaultValue={contractData?.supervisorCompany}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Valor do Contrato de Supervisão (R$)
                          </label>
                          <input
                            type="number"
                            name="contractValue"
                            required
                            defaultValue={contractData?.contractValue || 3450000}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">
                              Início da Supervisão
                            </label>
                            <input
                              type="date"
                              name="contractStartDate"
                              defaultValue={contractData?.contractStartDate || "2025-01-15"}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">
                              Término da Supervisão
                            </label>
                            <input
                              type="date"
                              name="contractEndDate"
                              defaultValue={contractData?.contractEndDate || "2027-01-15"}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-3">
                        <button
                          type="submit"
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-2 px-6 rounded-xl text-xs transition shadow-3xs cursor-pointer"
                        >
                          Salvar Configurações do Contrato
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-4">
                    <h3 className="text-sm font-black text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse-slow" />
                      <span>Manutenção de Sistema</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Caso necessite limpar todos os registros inseridos ou queira redefinir a base de dados de testes para o padrão do contrato do DER-PR, utilize o botão abaixo. Essa ação restaurará as três obras padrão e apagará quaisquer logs personalizados.
                    </p>
                    <div className="flex gap-4">
                      <button
                        onClick={handleResetDatabase}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs transition shadow-3xs cursor-pointer"
                      >
                        Restaurar Base de Dados Padrão
                      </button>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

        </main>
      </div>

      {/* CHATBOT GEMINI AI SIDEBAR PANEL */}
      {isAiOpen && (
        <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-slate-900 text-white shadow-2xl border-l border-slate-800 flex flex-col animation-slide-in">
          {/* AI Sidebar Header */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-amber-400" />
              <div>
                <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider">
                  Assistente de Fiscalização
                </h4>
                <span className="text-[9px] bg-amber-500 text-slate-950 px-1 rounded font-extrabold tracking-wide uppercase">
                  Gemini 2.5 Flash
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsAiOpen(false)}
              className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* AI Sidebar Chat Messages List */}
          <div className="flex-grow p-4 overflow-y-auto space-y-4 text-xs">
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-2.5 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {msg.sender === "ai" ? (
                  <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm text-slate-950 font-black">
                    AI
                  </div>
                ) : (
                  <div className="w-7 h-7 bg-slate-700 rounded-lg flex items-center justify-center shrink-0 shadow-sm font-black uppercase text-[10px]">
                    VC
                  </div>
                )}
                <div
                  className={`p-3 rounded-xl max-w-[80%] font-medium leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-amber-500 text-slate-950 font-semibold"
                      : "bg-slate-800 border border-slate-700 text-slate-100"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isAiLoading && (
              <div className="flex gap-2.5 items-center text-[10px] text-slate-400 font-bold">
                <Bot className="w-4 h-4 text-amber-500 animate-spin" />
                <span>Analisando relatórios e formulando resposta técnica...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* AI Sidebar Input Form */}
          <form onSubmit={handleSendAiMessage} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              placeholder="Pergunte sobre as obras, medições..."
              value={aiMessage}
              onChange={(e) => setAiMessage(e.target.value)}
              className="flex-grow bg-slate-800 border border-slate-700 focus:border-amber-400 focus:outline-none rounded-xl px-3 py-2 text-xs text-white"
            />
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-2 rounded-xl transition cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* LIGHTBOX POPUP FOR BIG IMAGE PREVIEW */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="fixed inset-0 cursor-zoom-out" onClick={() => setLightboxImage(null)} />
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-800">
            <img src={lightboxImage} alt="Ampliação do relatório" className="max-w-full max-h-[85vh] object-contain" />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 p-2 bg-slate-950/80 hover:bg-slate-950 text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* CORE ACTIVITY MODAL MODIFIER (MEDICAO & BOLETIN) */}
      {selectedWorkForActivity && (
        <ActivityModal
          isOpen={isActivityOpen}
          onClose={() => {
            setIsActivityOpen(false);
            setSelectedWorkForActivity(null);
            setSelectedLogForEdit(null);
          }}
          work={selectedWorkForActivity}
          activeUser={activeUser}
          onSubmittingActivity={handleSubmittingActivity}
          onUpdatingActivity={handleUpdatingActivity}
          existingLog={selectedLogForEdit}
        />
      )}

      {/* ADD/EDIT WORK FORM MODAL */}
      <WorkFormModal
        isOpen={isWorkFormOpen}
        onClose={() => {
          setIsWorkFormOpen(false);
          setSelectedWorkForEdit(null);
        }}
        onSubmit={handleWorkFormSubmit}
        existingObra={selectedWorkForEdit}
      />
    </div>
  );
}
