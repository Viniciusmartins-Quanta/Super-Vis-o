import React, { useState, useEffect } from "react";
import { Obra, DatabaseState, UserProfile, USER_PROFILES, ContractAdditive } from "./types";
import { formatDate, formatCurrency } from "./utils";
import { supabase } from "./supabase";

import ContractOverview from "./components/ContractOverview";
import DashboardFilters from "./components/DashboardFilters";
import UserAccessControl from "./components/UserAccessControl";
import WorkCard from "./components/WorkCard";
import WorkModal from "./components/WorkModal";
import WorkDetail from "./components/WorkDetail";

import { Plus, Construction, ClipboardList, AlertTriangle, CheckSquare, RefreshCw, Cloud, Database, Sliders, Users, X, LogOut } from "lucide-react";

export default function App() {
  const [state, setState] = useState<any>({
    contractName: "",
    supervisorCompany: "",
    works: [],
    logs: [],
    authorizedUsers: [],
    readonlyUsers: [] 
  });

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null); 
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(true); 
  const [authError, setAuthError] = useState("");
  const [errorHeader, setErrorHeader] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const [activeUser, setActiveUser] = useState<UserProfile>(USER_PROFILES[0]);
  const [search, setSearch] = useState("");
  const [reportWeek, setReportWeek] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("posicao");
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAccessControlOpen, setIsAccessControlOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<Obra | null>(null);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  
  const currentUserEmail = "vinicius.martins@quantaconsultoria.com";

  // ==========================================
  // LÓGICA DE PERMISSÕES 
  // ==========================================
  const emailLogado = session?.user?.email;
  const isSuperAdmin = emailLogado === currentUserEmail; 
  const isEditor = isSuperAdmin || (state.authorizedUsers && state.authorizedUsers.includes(emailLogado));
  const isViewer = state.readonlyUsers && state.readonlyUsers.includes(emailLogado);
  const isApproved = isEditor || isViewer;
  const canEdit = isEditor;

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

  const loadDirectSupabaseState = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) console.error("No active session found in loadDirectSupabaseState");

      const { data: configData, error: configError } = await supabase.from("contrato_config").select("*").eq("id", "config-atual").maybeSingle();
      let errors: string[] = [];
      if (configError) errors.push("configuração");
      
      const configSegura = configData || { contract_name: "Contrato de Supervisão (Novo)", supervisor_company: "Empresa Supervisora", contract_value: 0, contract_start_date: "", contract_end_date: "" };

      const { data: obrasData, error: obrasError } = await supabase.from("obras").select("*").order("order_index", { ascending: true });
      if (obrasError) errors.push("obras");

      const { data: logsData, error: logsError } = await supabase.from("medicoes_logs").select("*").order("timestamp", { ascending: false });
      if (logsError) errors.push("logs");

      const { data: aditivosData, error: aditivosError } = await supabase.from("aditivos").select("*");
      if (aditivosError) errors.push("aditivos");

      setErrorHeader(errors.length > 0 ? `Erro ao carregar: ${errors.join(", ")}` : "");

      const obrasFormatadas = (obrasData || []).map((o: any) => {
        const workLogs = (logsData || []).filter((l: any) => l.work_id === o.id);
        let progressVal = o.progress || 0;
        if (workLogs.length > 0) {
          const sorted = [...workLogs].sort((a, b) => {
            const aTime = getLogStartDate(a.notes || "", a.timestamp || "");
            const bTime = getLogStartDate(b.notes || "", b.timestamp || "");
            if (aTime !== bTime) return bTime - aTime;
            return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
          });
          progressVal = sorted[0].new_progress ?? o.progress ?? 0;
        }

        return {
          id: o.id, name: o.name, contractNumber: o.contract_number || "S/N", contractorName: o.contractor_name || "Construtora não informada", progress: progressVal, status: o.status || "em_andamento", deadlineDate: o.deadline_date || "2025-01-01", activeContractDate: o.active_contract_date || "2025-01-01", biddedValue: o.bidded_value || 0, order: o.order_index || 0, biddingNumber: o.bidding_number || "", adminProcess: o.admin_process || "", termDaysVigencia: o.term_days_vigencia || "", termDaysExecucao: o.term_days_execucao || "", signingDate: o.signing_date || "", publicationDateJom: o.publication_date_jom || "", startOrderDate: o.start_order_date || "", startDate: o.start_date || "", physicalStartDate: o.start_date || "", additives: o.additives || [], timelineImage: o.timeline_image || ""
        };
      });

      const logsFormatados = (logsData || []).map((l: any) => {
        const obraRelacionada = obrasFormatadas.find((w: any) => w.id === l.work_id);
        return {
          id: l.id, workId: l.work_id, workName: obraRelacionada ? obraRelacionada.name : "Obra Desconhecida", userName: l.user_name || "Usuário", userRole: l.user_role || "", oldProgress: l.old_progress || 0, newProgress: l.new_progress || 0, notes: l.notes || "", coverImage: l.cover_image, progressImages: l.progress_images || [], timestamp: l.timestamp || new Date().toISOString()
        };
      });

      const aditivosFormatados = (aditivosData || []).map((a: any) => ({
        id: a.id, number: a.number || "00", type: a.type || "", value: a.value || 0, days: a.days || 0, description: a.description || "", signatureDate: a.signature_date || "2024-01-01"
      }));

      setState({
        contractName: configSegura.contract_name, supervisorCompany: configSegura.supervisor_company, contractValue: configSegura.contract_value, contractStartDate: configSegura.contract_start_date || "", contractEndDate: configSegura.contract_end_date || "", contractAdditives: aditivosFormatados, works: obrasFormatadas, logs: logsFormatados, 
        authorizedUsers: configSegura.authorized_emails || [], 
        readonlyUsers: configSegura.readonly_emails || [], 
        supabaseStatus: { connected: true, tableExists: true, rlsEnabled: false, error: "" }
      });

    } catch (err: any) {
      setErrorHeader("Erro ao conectar com o banco de dados.");
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  const loadState = async (showLoadingIndicator = false) => {
    if (showLoadingIndicator) setLoading(true);
    setIsSyncing(true);
    try {
      await loadDirectSupabaseState();
      setErrorHeader("");
    } catch (err) {
      setErrorHeader("Falha na sincronização.");
    } finally {
      if (showLoadingIndicator) setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadDirectSupabaseState();
    const canalTempoReal = supabase.channel('escuta-banco-inteiro').on('postgres_changes', { event: '*', schema: 'public' }, () => loadDirectSupabaseState()).subscribe();
    return () => { supabase.removeChannel(canalTempoReal); };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setIsAuthLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); setIsAuthLoading(false); });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); setIsAuthLoading(true); setAuthError("");
    const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
    if (error) { setAuthError(error.message); setIsAuthLoading(false); } 
    else { setAuthError("✅ Conta criada! Um administrador precisa liberar seu acesso."); setIsRegisterMode(false); setIsAuthLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setIsAuthLoading(true); setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    if (error) { setAuthError("Email ou senha incorretos."); setIsAuthLoading(false); }
  };
 
  const handleResetData = async () => {
    setLoading(true); await loadDirectSupabaseState(); setErrorHeader("");
  };

  const handleUpdateAccess = async (editors: string[], viewers: string[]) => {
    setState({ ...state, authorizedUsers: editors, readonlyUsers: viewers });
    await supabase.from("contrato_config").update({ authorized_emails: editors, readonly_emails: viewers }).eq("id", "config-atual");
    setIsAccessControlOpen(false);
  };

  const handleUpdateSettings = async (contractName: string, supervisorCompany: string, contractValue?: number, contractStartDate?: string, contractEndDate?: string, contractAdditives?: ContractAdditive[]) => {
    if (!canEdit) return alert("Acesso Negado: Permissão apenas de leitura.");
    try {
      const { error: configError } = await supabase.from("contrato_config").upsert({ id: "config-atual", contract_name: contractName, supervisor_company: supervisorCompany, contract_value: contractValue || 0, contract_start_date: contractStartDate || null, contract_end_date: contractEndDate || null, updated_at: new Date().toISOString() });
      if (configError) throw configError;

      if (contractAdditives && contractAdditives.length > 0) {
        for (const add of contractAdditives) {
          await supabase.from("aditivos").upsert({ id: add.id || `add-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, config_id: "config-atual", number: add.number, type: add.type, value: add.value || 0, days: add.days || 0, description: add.description, signature_date: add.signatureDate || null });
        }
      }
      await loadDirectSupabaseState();
    } catch (err: any) { setErrorHeader("Não foi possível salvar os dados."); }
  };

  const updateWorkProgressToMostRecent = async (workId: string) => {
    try {
      const { data: logsData } = await supabase.from("medicoes_logs").select("*").eq("work_id", workId);
      const logs = logsData || [];
      if (logs.length === 0) return;
      const sortedLogs = [...logs].sort((a, b) => {
        const aTime = getLogStartDate(a.notes || "", a.timestamp || "");
        const bTime = getLogStartDate(b.notes || "", b.timestamp || "");
        if (aTime !== bTime) return bTime - aTime;
        return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
      });
      const mostRecentLog = sortedLogs[0];
      const targetProgress = mostRecentLog.new_progress ?? 0;
      await supabase.from("obras").update({ progress: targetProgress }).eq("id", workId);
    } catch (err) { console.error("Erro ao sincronizar progresso mais recente:", err); }
  };

  const handleLaunchMeasurement = async (workId: string, newProgress: number, notes: string, updaterName: string, updaterRole: string, coverImage?: string, progressImages?: string[]) => {
    if (!canEdit) return alert("Acesso Negado: Permissão apenas de leitura.");
    try {
      const obraAtual = state.works.find((w:any) => w.id === workId);
      const oldProgress = obraAtual ? obraAtual.progress : 0;
      const { error: insertError } = await supabase.from("medicoes_logs").insert([{ id: `log-${Date.now()}`, work_id: workId, user_name: updaterName, user_role: updaterRole, old_progress: oldProgress, new_progress: newProgress, notes: notes, cover_image: coverImage || null, progress_images: progressImages || [] }]);
      if (insertError) throw insertError;
      await updateWorkProgressToMostRecent(workId);
      await loadDirectSupabaseState();
    } catch (err: any) { setErrorHeader("Erro ao enviar boletim."); }
  };

  const handleUpdateLogNotes = async (logId: string, notes: string) => {
    if (!canEdit) return alert("Acesso Negado: Permissão apenas de leitura.");
    try {
      const logEntry = state.logs.find((l:any) => l.id === logId);
      if (!logEntry) throw new Error("Log não encontrado.");
      const { error } = await supabase.from("medicoes_logs").update({ notes }).eq("id", logId);
      if (error) throw error;
      await updateWorkProgressToMostRecent(logEntry.workId);
      await loadDirectSupabaseState();
    } catch (err) { setErrorHeader("Erro ao salvar alteração."); }
  };

  const handleUpdateLog = async (logId: string, newProgress: number, notes: string, coverImage?: string, progressImages?: string[]) => {
    if (!canEdit) return alert("Acesso Negado: Permissão apenas de leitura.");
    try {
      const logEntry = state.logs.find((l:any) => l.id === logId);
      if (!logEntry) throw new Error("Log não encontrado.");
      const { error: logError } = await supabase.from("medicoes_logs").update({ notes, new_progress: newProgress, cover_image: coverImage || null, progress_images: progressImages || [] }).eq("id", logId);
      if (logError) throw logError;
      await updateWorkProgressToMostRecent(logEntry.workId);
      await loadDirectSupabaseState();
    } catch (err) { setErrorHeader("Erro ao salvar alteração."); }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!canEdit) return alert("Acesso Negado: Permissão apenas de leitura.");
    try {
      const logEntry = state.logs.find((l:any) => l.id === logId);
      if (!logEntry) throw new Error("Log não encontrado.");
      const workId = logEntry.workId;
      const { error } = await supabase.from("medicoes_logs").delete().eq("id", logId);
      if (error) throw error;
      await updateWorkProgressToMostRecent(workId);
      await loadDirectSupabaseState();
    } catch (err) { setErrorHeader("Não foi possível excluir o boletim."); }
  };

  const handleDeleteWork = async (workId: string) => {
    if (!canEdit) return alert("Acesso Negado: Permissão apenas de leitura.");
    try {
      const { error } = await supabase.from("obras").delete().eq("id", workId);
      if (error) throw error;
      await loadDirectSupabaseState();
      setSelectedWorkId(null);
    } catch (err) { setErrorHeader("Não foi possível excluir a obra do servidor."); }
  };

  const handleMoveWork = async (workId: string, direction: "up" | "down") => {
    if (!canEdit) return alert("Acesso Negado: Permissão apenas de leitura.");
    const sorted = [...state.works].map((w:any, index) => {
      if (w.order === undefined) return { ...w, order: index }; return w;
    }).sort((a:any, b:any) => (a.order ?? 0) - (b.order ?? 0));

    const idx = sorted.findIndex(w => w.id === workId);
    if (idx === -1) return;

    if (direction === "up" && idx > 0) {
      const temp = sorted[idx]; sorted[idx] = sorted[idx - 1]; sorted[idx - 1] = temp;
    } else if (direction === "down" && idx < sorted.length - 1) {
      const temp = sorted[idx]; sorted[idx] = sorted[idx + 1]; sorted[idx + 1] = temp;
    }

    const updatedWorks = sorted.map((w:any, i) => ({ ...w, order: i }));
    setState({ ...state, works: updatedWorks });
    try {
      for (const work of updatedWorks) {
        await supabase.from("obras").update({ order_index: work.order }).eq("id", work.id);
      }
    } catch (err) { setErrorHeader("Erro na ordenação."); }
  };

  const handleSaveWork = async (workData: Partial<Obra>) => {
    if (!canEdit) return alert("Acesso Negado: Permissão apenas de leitura.");
    try {
      const isEditing = !!workData.id;
      const workId = workData.id || `obra-${Date.now()}`;

      const payloadObra = {
        id: workId, name: workData.name, contract_number: workData.contractNumber, contractor_name: workData.contractorName, progress: workData.progress || 0, status: workData.status, deadline_date: workData.deadlineDate || null, active_contract_date: workData.activeContractDate || null, bidded_value: workData.biddedValue || 0, bidding_number: workData.biddingNumber || null, admin_process: workData.adminProcess || null, term_days_vigencia: workData.termDaysVigencia || null, term_days_execucao: workData.termDaysExecucao || null, signing_date: workData.signingDate || null, publication_date_jom: workData.publicationDateJom || null, start_order_date: workData.startOrderDate || null, start_date: workData.physicalStartDate || workData.startDate || null, additives: workData.additives ? workData.additives : (editingWork ? editingWork.additives : []), timeline_image: workData.timelineImage || null
      };

      const { error: obraError } = await supabase.from("obras").upsert(payloadObra);
      if (obraError) throw obraError;

      if (!isEditing) {
        await supabase.from("medicoes_logs").insert([{ id: `log-${Date.now()}`, work_id: workId, user_name: activeUser.name, user_role: activeUser.role, old_progress: 0, new_progress: workData.progress || 0, notes: `Cadastro inicial do lote/obra supervisionada: ${workData.name || ""}.` }]);
      }
      setIsModalOpen(false); setEditingWork(null); await loadDirectSupabaseState();
    } catch (err: any) { setErrorHeader("Erro ao salvar obra."); }
  };

  const handleToggleReorderMode = () => {
    const nextMode = !isReorderMode;
    setIsReorderMode(nextMode);
    if (nextMode) setSortBy("posicao");
  };

  const filteredWorks = state.works.filter((w:any) => {
      const q = search.toLowerCase();
      const matchesText = w.name.toLowerCase().includes(q) || w.contractNumber.toLowerCase().includes(q) || w.contractorName.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || w.status === statusFilter;
      return matchesText && matchesStatus;
    }).sort((a:any, b:any) => {
      switch (sortBy) {
        case "posicao": return (a.order ?? 0) - (b.order ?? 0);
        case "valorDe": return b.biddedValue - a.biddedValue;
        case "valorAt": return a.biddedValue - b.biddedValue;
        case "progressoDe": return b.progress - a.progress;
        case "progressoAt": return a.progress - b.progress;
        case "termino": return new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime();
        case "nome": return a.name.localeCompare(b.name);
        default: return (a.order ?? 0) - (b.order ?? 0);
      }
    });

  const handleGenerateConsolidatedReport = () => {
    if (!reportWeek) return alert("Por favor, selecione uma semana para o relatório.");

    function valorParaExtenso(valor: number): string {
      if (valor === 0) return "Zero reais";
      const unidades = ["", "Um", "Dois", "Três", "Quatro", "Cinco", "Seis", "Sete", "Oito", "Nove"];
      const dezenas = ["", "Dez", "Vinte", "Trinta", "Quarenta", "Cinquenta", "Sessenta", "Setenta", "Oitenta", "Noventa"];
      const dezenas10_19 = ["Dez", "Onze", "Doze", "Treze", "Quatorze", "Quinze", "Dezesseis", "Dezessete", "Dezoito", "Dezenove"];
      const centenas = ["", "Cento", "Duzentos", "Trezentos", "Quatrocentos", "Quinhentos", "Seiscentos", "Setecentos", "Oitocentos", "Novecentos"];
      function converterGrupo(n: number): string {
        if (n === 100) return "Cem";
        const c = Math.floor(n / 100); const d = Math.floor((n % 100) / 10); const u = n % 10;
        let res = centenas[c];
        if (d === 1) { if (res) res += " e "; res += dezenas10_19[u]; } 
        else { if (d > 1) { if (res) res += " e "; res += dezenas[d]; } if (u > 0) { if (res || d > 1) res += " e "; res += unidades[u]; } }
        return res;
      }
      function converterInteiro(n: number): string {
        if (n === 0) return "Zero";
        let res = "";
        const milhoes = Math.floor(n / 1000000); const milhares = Math.floor((n % 1000000) / 1000); const unidadesSimples = n % 1000;
        if (milhoes > 0) { res += converterGrupo(milhoes); res += milhoes === 1 ? " Milhão" : " Milhões"; }
        if (milhares > 0) { if (res) { res += (unidadesSimples === 0 || milhares % 100 === 0) ? " e " : ", "; } if (milhares === 1) { res += "Mil"; } else { res += converterGrupo(milhares) + " Mil"; } }
        if (unidadesSimples > 0) { if (res) { res += (unidadesSimples < 100 || unidadesSimples % 100 === 0) ? " e " : ", "; } res += converterGrupo(unidadesSimples); }
        return res;
      }
      const parteInteira = Math.floor(valor); const parteDecimal = Math.round((valor - parteInteira) * 100);
      let extenso = converterInteiro(parteInteira); extenso += parteInteira === 1 ? " Real" : " Reais";
      if (parteDecimal > 0) { extenso += " e " + converterInteiro(parteDecimal); extenso += parteDecimal === 1 ? " Centavo" : " Centavos"; }
      return extenso;
    }

    const getNextWeekPeriod = (periodStr: string): string => {
      const dateRegex = /(\d{2})\/(\d{2})\/(\d{4})/g; const matches = [...periodStr.matchAll(dateRegex)];
      if (matches.length === 2) {
        const parseDate = (m: RegExpMatchArray) => new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
        const d1 = parseDate(matches[0]); const d2 = parseDate(matches[1]);
        const nextD1 = new Date(d1.getTime() + 7 * 24 * 60 * 60 * 1000); const nextD2 = new Date(d2.getTime() + 7 * 24 * 60 * 60 * 1000);
        const pad = (n: number) => n.toString().padStart(2, "0");
        return `${pad(nextD1.getDate())}/${pad(nextD1.getMonth() + 1)}/${nextD1.getFullYear()} a ${pad(nextD2.getDate())}/${pad(nextD2.getMonth() + 1)}/${nextD2.getFullYear()}`;
      }
      return "08/06/2026 a 12/06/2026";
    };

    const parsePeriodDates = (notes: string) => {
      if (!notes) return null;
      const periodMatch = notes.match(/(?:Período|Period):\s*\*?(\d{2})\/(\d{2})\/(\d{4})\s+a\s+(\d{2})\/(\d{2})\/(\d{4})/i);
      if (periodMatch) { return { start: new Date(parseInt(periodMatch[3]), parseInt(periodMatch[2]) - 1, parseInt(periodMatch[1])), end: new Date(parseInt(periodMatch[6]), parseInt(periodMatch[5]) - 1, parseInt(periodMatch[4])) }; }
      return null;
    };

    const getISOWeekString = (date: Date): string => {
      const target = new Date(date.valueOf()); const dayNr = (date.getDay() + 6) % 7; target.setDate(target.getDate() - dayNr + 3);
      const firstThursday = target.valueOf(); target.setMonth(0, 1);
      if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
      const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
      return `${new Date(firstThursday).getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    };

    const getDatesOfISOWeek = (w: string) => {
      const parts = w.split("-W"); if (parts.length !== 2) return null;
      const y = parseInt(parts[0], 10); const week = parseInt(parts[1], 10);
      const simple = new Date(y, 0, 4); const dayOfWeek = simple.getDay(); const ISOdayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
      const monday = new Date(simple.getTime() - (ISOdayOfWeek - 1) * 86400000); monday.setDate(monday.getDate() + (week - 1) * 7);
      const friday = new Date(monday); friday.setDate(monday.getDate() + 4);
      return { monday, friday };
    };

    const weekDates = getDatesOfISOWeek(reportWeek);
    let periodFormatted = "Período não disponível";
    if (weekDates) {
      const pad = (n: number) => n.toString().padStart(2, "0");
      periodFormatted = `${pad(weekDates.monday.getDate())}/${pad(weekDates.monday.getMonth() + 1)}/${weekDates.monday.getFullYear()} a ${pad(weekDates.friday.getDate())}/${pad(weekDates.friday.getMonth() + 1)}/${weekDates.friday.getFullYear()}`;
    }

    const activeWorks = state.works.filter((w:any) => {
      return state.logs.filter((log:any) => {
        let logDate = new Date(log.timestamp); const parsed = parsePeriodDates(log.notes);
        if (parsed) logDate = parsed.start;
        return getISOWeekString(logDate) === reportWeek && log.workId === w.id;
      }).length > 0;
    }).sort((a:any, b:any) => (a.order ?? 0) - (b.order ?? 0));

    if (activeWorks.length === 0) return alert("Nenhuma obra com lançamentos registrados na semana em questão foi encontrada.");

    const parseWeeklyReport = (notesText: string) => {
      const result = { period: "Semana não especificada", sitacaoAditivo: "N/A", infraDados: "N/A", enelStatus: "N/A", substationStatus: "N/A", relevantInfo: "N/A", weeklyActivities: [] as string[], nextWeekActivities: [] as string[], observations: [] as string[], isStandardReport: false };
      if (!notesText) return result;
      if (notesText.includes("RELATÓRIO DE ATIVIDADES") || notesText.includes("Período:")) result.isStandardReport = true;
      const pm = notesText.match(/(?:Período|Period):\s*\*?([^\n\r*]+)/i); if (pm) result.period = pm[1].trim();
      const am = notesText.match(/Situação do Aditivo:\*\*?\s*(.*)$/im); if (am) result.sitacaoAditivo = am[1].trim().replace(/\*/g, '');
      const im = notesText.match(/Infraestrutura de Dados:\*\*?\s*(.*)$/im); if (im) result.infraDados = im[1].trim().replace(/\*/g, '');
      const em = notesText.match(/Aumento de Carga \(ENEL\):\*\*?\s*(.*)$/im); if (em) result.enelStatus = em[1].trim().replace(/\*/g, '');
      const sm = notesText.match(/Subestação Elétrica:\*\*?\s*(.*)$/im); if (sm) result.substationStatus = sm[1].trim().replace(/\*/g, '');
      const rm = notesText.match(/Informação Relevante:\*\*?\s*(.*)$/im); if (rm) result.relevantInfo = rm[1].trim().replace(/\*/g, '');

      const extractSectionBullets = (headerKeyword: string) => {
        const lines = notesText.split("\n"); let startIdx = -1;
        for (let i = 0; i < lines.length; i++) { if (lines[i].toLowerCase().includes(headerKeyword.toLowerCase())) { startIdx = i; break; } }
        if (startIdx === -1) return [];
        const bullets: string[] = [];
        for (let i = startIdx + 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.includes("**") && !line.startsWith("•") && !line.startsWith("-") && !line.startsWith("*")) { if (!line.startsWith("•") && !line.startsWith("-") && !line.startsWith("*")) break; }
          if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) { const content = line.replace(/^[•\-\*]\s*/, "").trim(); if (content) bullets.push(content); } 
          else if (line !== "" && !line.includes("**") && bullets.length === 0) { bullets.push(line); }
        }
        return bullets;
      };

      result.weeklyActivities = extractSectionBullets("Atividades da Semana");
      result.nextWeekActivities = extractSectionBullets("Atividades da Próxima Semana");
      result.observations = extractSectionBullets("Observações & Apontamentos importantes");

      if (!result.isStandardReport || result.weeklyActivities.length === 0) {
        if (result.weeklyActivities.length === 0 && notesText) {
          const filteredLines = notesText.split("\n").map(l => l.trim()).filter(l => l && !l.includes("📋") && !l.includes("📅") && !l.includes("🔹"));
          if (filteredLines.length > 0) { result.weeklyActivities = [filteredLines.join(" ")]; } else { result.weeklyActivities = [notesText]; }
        }
      }
      return result;
    };

    let currentPage = 1;

    // 1. CAPA (Isolada com tamanho fixo e fundo próprio)
    const coverPageHtml = `
      <div class="cover-page">
        <div style="position: absolute; inset: 0; z-index: -1;">
          <img src="/cover.jpg" style="width: 100%; height: 100%; object-fit: cover;" alt="Capa" />
        </div>
        <div style="position: absolute; bottom: 0; left: 0; width: 100%; padding: 20mm; box-sizing: border-box;">
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
      </div>
    `;

    // 2. CONSTRUÇÃO DO CONTEÚDO DINÂMICO
    let contentHtml = "";

    // -- Resumo do Contrato --
    contentHtml += `<tbody class="section-tbody"><tr><td>`;
    contentHtml += `
      <div style="background-color: #f97316; border: 0.3mm solid black; padding: 7px 12px; text-align: center; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <h2 style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: black; margin: 0; text-transform: uppercase;">FICHA TÉCNICA DO CONTRATO DE SUPERVISÃO</h2>
      </div>
      <table class="black-grid-table" style="margin-bottom: 20px;">
        <tbody>
          <tr><td style="font-weight: bold; width: 45%;">Contrato de Supervisão:</td><td style="font-weight: bold;">${state.contractName}</td></tr>
          <tr><td style="font-weight: bold;">Empresa Supervisora:</td><td>${state.supervisorCompany}</td></tr>
          <tr><td style="font-weight: bold;">Início do Contrato:</td><td>${formatDate(state.contractStartDate)}</td></tr>
          <tr><td style="font-weight: bold;">Término do Contrato:</td><td>${formatDate(state.contractEndDate)}</td></tr>
          <tr><td style="font-weight: bold;">Valor do Contrato de Supervisão:</td><td style="font-weight: bold;">${formatCurrency(state.contractValue)}</td></tr>
        </tbody>
      </table>
      <div style="font-family: Arial, sans-serif; font-size: 10pt; font-weight: bold; color: black; margin-bottom: 8px; text-transform: uppercase; border-left: 3px solid #f97316; padding-left: 8px;">RESUMO DAS OBRAS ATIVAS NA SEMANA</div>
      <table class="black-grid-table">
        <thead><tr style="background-color: #f3f4f6;"><th style="font-weight: bold; text-align: left; width: 35%;">Obra</th><th style="font-weight: bold; text-align: left; width: 25%;">Construtora</th><th style="font-weight: bold; text-align: center; width: 15%;">Progresso</th><th style="font-weight: bold; text-align: center; width: 25%;">Boletim da Semana</th></tr></thead>
        <tbody>
          ${activeWorks.map((work:any) => {
            const logsForWork = state.logs.filter((log:any) => {
              let logDate = new Date(log.timestamp); const parsed = parsePeriodDates(log.notes); 
              if (parsed) {logDate = parsed.start;} 
              return getISOWeekString(logDate) === reportWeek && log.workId === work.id; 
            }); 
            const sortedLogs = [...logsForWork].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); 
            const latestLog = sortedLogs[0]; const progressVal = latestLog ? latestLog.newProgress : work.progress; 
            return `<tr><td style="font-weight: bold;">${work.name}</td><td>${work.contractorName || "N/A"}</td><td style="text-align: center; font-weight: bold;">${progressVal}%</td><td style="text-align: center;">${latestLog ? `<span style="color: #059669; font-weight: bold;">✔ Registrado</span>` : `<span style="color: #dc2626; font-style: italic;">Não registrado</span>`}</td></tr>`; 
          }).join("")}
        </tbody>
      </table>
    `;
    contentHtml += `</td></tr></tbody>`;

    // -- Loop nas Obras --
    activeWorks.forEach((work:any) => {
      const logsForWork = state.logs.filter((log:any) => { let logDate = new Date(log.timestamp); const parsed = parsePeriodDates(log.notes); if (parsed) logDate = parsed.start; return getISOWeekString(logDate) === reportWeek && log.workId === work.id; });
      const sortedLogs = [...logsForWork].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const log = sortedLogs[0];
      
      const biddingNumber = work.biddingNumber || "39/2022"; const adminProcess = work.adminProcess || "4200/2022"; const signingDate = work.signingDate ? formatDate(work.signingDate) : formatDate(work.startDate); const publicationDateJom = work.publicationDateJom ? formatDate(work.publicationDateJom) : formatDate(work.startDate); const startOrderDate = work.startOrderDate ? formatDate(work.startOrderDate) : formatDate(work.startDate); const termDaysVigencia = work.termDaysVigencia || "8 meses"; const termDaysExecucao = work.termDaysExecucao || "8 meses"; const parsedValueExtenso = valorParaExtenso(work.biddedValue);
      
      let additivesTableRows = "";
      if (work.additives && work.additives.length > 0) {
        additivesTableRows = work.additives.map((add:any, idx:number) => {
          const orderWord = `${idx + 1}º ADITIVO`; const publishJomDate = add.description ? (add.description.match(/JOM de (\d{2}\/\d{2}\/\d{4})/i)?.[1] || formatDate(add.signatureDate)) : formatDate(add.signatureDate);
          const lines = [`Data assinatura: <span style="font-weight: bold;">${formatDate(add.signatureDate)}</span>`, `Data publicação JOM: <span style="font-weight: bold;">${publishJomDate}</span>`];
          if (add.days) lines.push(`Prazo Aditivado: <span style="font-weight: bold;">${add.days} dias</span>`); else if (add.type === "prazo" || add.type === "misto") lines.push(`Prazo Aditivado: <span style="font-weight: bold;">N/A</span>`);
          if (add.value !== undefined && add.value !== null) { lines.push(`Valor Aditivado: <span style="font-weight: bold;">${formatCurrency(add.value)}</span>`); if (add.type === "financeiro" || add.type === "misto") lines.push(`Novo Valor Contratual: <span style="font-weight: bold;">${formatCurrency(work.biddedValue + add.value)}</span>`); }
          if (add.newVigenciaDate) lines.push(`Novo Prazo Contratual: <span style="font-weight: bold; color: #ea580c;">${formatDate(add.newVigenciaDate)}</span>`);
          if (add.newExecucaoDate) lines.push(`Novo Prazo de Execução Contratual: <span style="font-weight: bold; color: #ea580c;">${formatDate(add.newExecucaoDate)}</span>`); else if (add.newVigenciaDate) lines.push(`Novo Prazo de Execução Contratual: <span style="font-weight: bold; color: #ea580c;">${formatDate(add.newVigenciaDate)}</span>`);
          const rowspan = lines.length;
          return lines.map((line, lineIdx) => {
            if (lineIdx === 0) return `<tr><td rowspan="${rowspan}" style="text-align: center; vertical-align: middle; font-weight: bold; text-transform: uppercase; width: 25%; font-family: Arial, sans-serif;">${orderWord}</td><td style="font-family: Calibri, sans-serif; font-size: 9.2pt;">${line}</td></tr>`;
            else return `<tr><td style="font-family: Calibri, sans-serif; font-size: 9.2pt;">${line}</td></tr>`;
          }).join("");
        }).join("");
      }

      if (log) {
        const parsed = parseWeeklyReport(log.notes);
        
        // Ficha Técnica (Quebra a página antes)
        contentHtml += `<tbody class="section-tbody break-before"><tr><td>`;
        contentHtml += `
          <div style="background-color: #f97316; border: 0.3mm solid black; padding: 7px 12px; text-align: center; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"><h2 style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: black; margin: 0; text-transform: uppercase; letter-spacing: 0.1px;">${work.name}</h2></div>
          <div class="border border-black flex items-center justify-center relative overflow-hidden mb-3 bg-slate-50 shadow-2xs" style="border-width: 0.3mm; height: 70mm;">${log.coverImage ? `<img src="${log.coverImage}" class="w-full h-full object-contain" alt="Foto da Capa da Semana" />` : `<div class="border border-slate-200 bg-white/90 shadow-sm rounded-none px-10 py-8 max-w-sm text-center border-dashed font-mono space-y-4"><span class="text-slate-405 text-3xl block">📷</span><div><span class="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold block">FOTO DE CAPA DA OBRA</span></div></div>`}</div>
          <table class="black-grid-table" style="margin-top: 5px;">
            <tbody>
              <tr><td style="font-weight: bold; width: 45%;">Contrato N°:</td><td style="font-weight: bold;">${work.contractNumber}</td></tr>
              <tr><td style="font-weight: bold;">Concorrência Pública:</td><td>${biddingNumber}</td></tr>
              <tr><td style="font-weight: bold;">Proc. Administrativo:</td><td>${adminProcess}</td></tr>
              <tr><td style="font-weight: bold;">Assinatura Contrato:</td><td>${signingDate}</td></tr>
              <tr><td style="font-weight: bold;">Publicação no JOM:</td><td>${publicationDateJom}</td></tr>
              <tr><td style="font-weight: bold;">Ordem de Início:</td><td>${startOrderDate}</td></tr>
              <tr><td style="font-weight: bold;">Empresa Vencedora:</td><td style="text-transform: uppercase;">${work.contractorName}</td></tr>
              <tr><td style="font-weight: bold;">Prazo Vigência:</td><td>${termDaysVigencia}</td></tr>
              <tr><td style="font-weight: bold;">Prazo Execução:</td><td>${termDaysExecucao}</td></tr>
              <tr><td style="font-weight: bold;">Início de Atividades:</td><td>${formatDate(work.startDate)}</td></tr>
              <tr><td style="font-weight: bold;">Valor Total Inicial:</td><td style="font-weight: bold;">${formatCurrency(work.biddedValue)} <span style="font-size: 8pt; font-weight: normal; font-style: italic;">(${parsedValueExtenso})</span></td></tr>
              ${additivesTableRows}
            </tbody>
          </table>
        `;
        contentHtml += `</td></tr></tbody>`;

        // Cronologia (Quebra a página antes)
        contentHtml += `<tbody class="section-tbody break-before"><tr><td>`;
        contentHtml += `
          <div><h3 class="text-xs font-black text-slate-800 uppercase tracking-widest border-l-2 border-orange-500 pl-2">CRONOLOGIA DA OBRA — ${work.name}</h3></div>
          ${work.timelineImage ? `<div class="mt-4"><img src="${work.timelineImage}" alt="Cronograma da Obra" style="max-width: 100%; max-height: 200mm; object-fit: contain; margin: 0 auto; display: block;" /></div>` : `<div class="mt-4 p-4 border-2 border-dashed border-slate-300 rounded-none text-slate-500 text-xs text-center">Inserir cronologia da obra aqui.</div>`}
        `;
        contentHtml += `</td></tr></tbody>`;

        // Atividades (A TABELA QUE VAI CRESCER INFINITAMENTE, Quebra a página antes)
        contentHtml += `<tbody class="section-tbody break-before"><tr><td>`;
        contentHtml += `
          <div style="background-color: #f97316; border: 0.3mm solid black; padding: 6px 10px; text-align: center; margin-bottom: 8px;"><h2 style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: black; margin: 0; text-transform: uppercase;">ATIVIDADES DE FISCALIZAÇÃO — ${work.name}</h2></div>
          <table class="black-grid-table">
            <tbody>
              <tr><td style="font-weight: bold; width: 42%;">% Físico executado:</td><td style="font-weight: bold;">${log.newProgress}%</td></tr>
              <tr><td style="font-weight: bold;">Situação do Aditivo:</td><td>${parsed.sitacaoAditivo || "N/A"}</td></tr>
              <tr><td style="font-weight: bold;">Informação Relevante:</td><td>${parsed.relevantInfo || "N/A"}</td></tr>
              <tr><td style="font-weight: bold;">Atividades de Infraestrutura de Dados:</td><td>${parsed.infraDados || "N/A"}</td></tr>
              <tr><td style="font-weight: bold;">Status aumento de carga (Enel):</td><td>${parsed.enelStatus || "N/A"}</td></tr>
              <tr><td style="font-weight: bold;">Status da Subestação Elétrica:</td><td>${parsed.substationStatus || "N/A"}</td></tr>
              <tr>
                <td style="font-weight: bold; vertical-align: top;">Atividades da semana: <br/><span style="font-weight: normal; font-size: 8pt;">${parsed.period}</span></td>
                <td style="vertical-align: top; padding: 4px 8px;">
                  <ul style="list-style-type: none; margin: 0; padding: 0;">${parsed.weeklyActivities.map(act => `<li style="margin-top: 4px; padding-left: 12px; position: relative; font-family: 'Calibri', 'Arial', sans-serif; font-size: 9.2pt; font-weight: normal;"><span style="position: absolute; left: 0; top: 0;">•</span>${act}</li>`).join("") || `<li style="margin-top: 4px; font-style: italic; color: #777;">Nenhuma atividade descrita.</li>`}</ul>
                </td>
              </tr>
              <tr>
                <td style="font-weight: bold; vertical-align: top;">Atividades da próxima semana: <br/><span style="font-weight: normal; font-size: 8pt;">${getNextWeekPeriod(parsed.period)}</span></td>
                <td style="vertical-align: top; padding: 4px 8px;">
                  <ul style="list-style-type: none; margin: 0; padding: 0;">${parsed.nextWeekActivities.map(act => `<li style="margin-top: 4px; padding-left: 12px; position: relative; font-family: 'Calibri', 'Arial', sans-serif; font-size: 9.2pt; font-weight: normal;"><span style="position: absolute; left: 0; top: 0;">•</span>${act}</li>`).join("") || `<li style="margin-top: 4px; font-style: italic; color: #777;">Nenhuma atividade programada.</li>`}</ul>
                </td>
              </tr>
              <tr>
                <td style="font-weight: bold; vertical-align: top;">Observações e apontamentos importantes:</td>
                <td style="vertical-align: top; padding: 4px 8px;">
                  <ul style="list-style-type: none; margin: 0; padding: 0;">${parsed.observations.map(obs => { const cleaned = obs.trim(); if (cleaned.toLowerCase().startsWith("não conformidade") || cleaned.toLowerCase().startsWith("nao conformidade")) { const content = cleaned.replace(/^não conformidade:?/i, "").replace(/^nao conformidade:?/i, "").trim(); return `<li style="margin-top: 4px; font-family: 'Calibri', 'Arial', sans-serif; font-size: 9.2pt;"><strong style="color: #000000; font-family: 'Arial', sans-serif; font-size: 9.2pt;">Não conformidade</strong><br/>${content}</li>`; } return `<li style="margin-top: 4px; padding-left: 12px; position: relative; font-family: 'Calibri', 'Arial', sans-serif; font-size: 9.2pt; font-weight: normal;"><span style="position: absolute; left: 0; top: 0;">•</span>${cleaned}</li>`; }).join("") || `<li style="margin-top: 4px; font-style: italic; color: #777;">Nenhum apontamento crítico.</li>`}</ul>
                </td>
              </tr>
            </tbody>
          </table>
        `;
        contentHtml += `</td></tr></tbody>`;

        // Fotos da Semana (Quebra a página antes para garantir que não separem)
        contentHtml += `<tbody class="section-tbody break-before"><tr><td>`;
        contentHtml += `
          <div style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: black; margin-bottom: 4mm; text-transform: uppercase;">FOTOS DA SEMANA — ${work.name}:</div>
          <div style="border: 0.3mm solid black; padding: 10px; background-color: #ffffff; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; align-content: start;">
            <div style="border: 1px solid #000000; aspect-ratio: 1.34; overflow: hidden; display: flex; align-items: center; justify-content: center; background-color: #f3f4f6; position: relative;">${log.progressImages && log.progressImages[0] ? `<img src="${log.progressImages[0]}" style="width: 100%; height: 100%; object-fit: cover;" alt="Foto 1" />` : `<div style="text-align: center; font-family: monospace; font-size: 9px; color: #a0a0a0;"><div>📷</div><div>F-01 (Vazio)</div></div>`}</div>
            <div style="border: 1px solid #000000; aspect-ratio: 1.34; overflow: hidden; display: flex; align-items: center; justify-content: center; background-color: #f3f4f6; position: relative;">${log.progressImages && log.progressImages[1] ? `<img src="${log.progressImages[1]}" style="width: 100%; height: 100%; object-fit: cover;" alt="Foto 2" />` : `<div style="text-align: center; font-family: monospace; font-size: 9px; color: #a0a0a0;"><div>📷</div><div>F-02 (Vazio)</div></div>`}</div>
            <div style="border: 1px solid #000000; aspect-ratio: 1.34; overflow: hidden; display: flex; align-items: center; justify-content: center; background-color: #f3f4f6; position: relative;">${log.progressImages && log.progressImages[2] ? `<img src="${log.progressImages[2]}" style="width: 100%; height: 100%; object-fit: cover;" alt="Foto 3" />` : `<div style="text-align: center; font-family: monospace; font-size: 9px; color: #a0a0a0;"><div>📷</div><div>F-03 (Vazio)</div></div>`}</div>
            <div style="border: 1px solid #000000; aspect-ratio: 1.34; overflow: hidden; display: flex; align-items: center; justify-content: center; background-color: #f3f4f6; position: relative;">${log.progressImages && log.progressImages[3] ? `<img src="${log.progressImages[3]}" style="width: 100%; height: 100%; object-fit: cover;" alt="Foto 4" />` : `<div style="text-align: center; font-family: monospace; font-size: 9px; color: #a0a0a0;"><div>📷</div><div>F-04 (Vazio)</div></div>`}</div>
          </div>
        `;
        contentHtml += `</td></tr></tbody>`;

      } else {
        contentHtml += `<tbody class="section-tbody break-before"><tr><td>`;
        contentHtml += `
          <div style="background-color: #e2e8f0; border: 0.3mm solid black; border-radius: 0px; padding: 6px 10px; text-align: center; margin-bottom: 20px;"><h2 style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: black; margin: 0; text-transform: uppercase;">OBRA: ${work.name}</h2></div>
          <div style="border: 1px dashed #cbd5e1; padding: 40px; text-align: center; border-radius: 8px; margin-top: 40px; font-family: Calibri, sans-serif; color: #64748b;"><div style="font-size: 24pt; margin-bottom: 12px;">📋</div><div style="font-size: 11pt; font-weight: bold; color: #334155; margin-bottom: 8px;">Sem lançamentos registrados para esta obra na semana</div><div style="font-size: 9.5pt;">Esta obra encontra-se ativa no contrato de gerenciamento, mas não recebeu boletins de fiscalização de atividades ou de progresso na semana selecionada (${periodFormatted}).</div></div>
        `;
        contentHtml += `</td></tr></tbody>`;
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
    <style>
      @page { size: A4; margin: 0; }
      body { margin: 0; padding: 0;