import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { supabaseSessionMiddleware } from "./src/supabaseServer";

dotenv.config();

interface Obra {
  id: string;
  name: string;
  contractNumber: string;
  startDate: string;
  deadlineDate: string;
  activeContractDate: string;
  progress: number;
  contractorName: string;
  biddedValue: number;
  status: "planejamento" | "em_andamento" | "paralisada" | "concluida";
  biddingNumber?: string;
  adminProcess?: string;
  termDaysVigencia?: string;
  termDaysExecucao?: string;
  signingDate?: string;
  publicationDateJom?: string;
  physicalStartDate?: string;
  startOrderDate?: string;
  additives?: ContractAdditive[];
  timelineImage?: string;
}

interface UpdateLog {
  id: string;
  workId: string;
  workName: string;
  userName: string;
  userRole: string;
  timestamp: string;
  oldProgress: number;
  newProgress: number;
  notes: string;
  coverImage?: string;
  progressImages?: string[];
}

interface ContractAdditive {
  id: string;
  number: string;
  type: "financeiro" | "prazo" | "misto";
  value?: number;
  days?: number;
  description: string;
  signatureDate: string;
}

interface Database {
  contractName: string;
  supervisorCompany: string;
  contractValue?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  contractAdditives?: ContractAdditive[];
  works: Obra[];
  logs: UpdateLog[];
}

const DB_PATH = path.join(process.cwd(), "database.json");

const defaultData: Database = {
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

const SUPABASE_URL = process.env.SUPABASE_URL || "https://sfxyybvhxntsyfyiinov.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHl5YnZoeG50c3lmeWlpbm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODcwNDQsImV4cCI6MjA5NzQ2MzA0NH0.kbBekuJeGhwaLeJHCP8rQhUsNE0ba4XIMfGVkLw26rA";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const supabaseStatus = {
  connected: false,
  tableExists: false,
  rlsEnabled: false,
  error: "Não inicializado"
};

function readDbLocal(): Database {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), "utf-8");
      return defaultData;
    }
    const content = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(content) as Database;
  } catch (error) {
    console.error("Erro ao ler banco de dados JSON local, usando dados padrão:", error);
    return defaultData;
  }
}

function writeDbLocal(data: Database) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Erro ao escrever banco de dados JSON local:", error);
  }
}

async function getDatabaseState(): Promise<Database & { supabaseStatus?: typeof supabaseStatus }> {
  try {
    const { data, error } = await supabase
      .from("contract_state")
      .select("data")
      .eq("id", "current_state")
      .maybeSingle();

    if (error) {
      console.warn("Erro ao ler do Supabase:", error.message);
      const isMissingTable = error.code === "PGRST205" || error.message.includes("Could not find the table");
      
      supabaseStatus.connected = true;
      supabaseStatus.tableExists = !isMissingTable;
      supabaseStatus.rlsEnabled = false;
      supabaseStatus.error = error.message;
      return { ...readDbLocal(), supabaseStatus };
    }

    supabaseStatus.connected = true;
    supabaseStatus.tableExists = true;
    supabaseStatus.rlsEnabled = false;
    supabaseStatus.error = "";

    if (!data) {
      console.log("Tabela do Supabase encontrada mas vazia. Inicializando com dados locais...");
      const localData = readDbLocal();
      await saveDatabaseState(localData);
      return { ...localData, supabaseStatus };
    }

    return { ...(data.data as Database), supabaseStatus };
  } catch (err: any) {
    console.warn("Exception ao conectar com Supabase:", err.message);
    const isRls = err.message.includes("violates row-level security") || err.message.includes("42501");
    supabaseStatus.connected = false;
    supabaseStatus.tableExists = !err.message.includes("PGRST205");
    supabaseStatus.rlsEnabled = isRls;
    supabaseStatus.error = err.message;
    return { ...readDbLocal(), supabaseStatus };
  }
}

async function saveDatabaseState(data: Database): Promise<void> {
  // Always save locally first
  writeDbLocal(data);

  try {
    const { error } = await supabase
      .from("contract_state")
      .upsert({ id: "current_state", data: data, updated_at: new Date().toISOString() });

    if (error) {
      console.warn("Erro ao persistir no Supabase:", error.message);
      const isRls = error.code === "42501" || error.message.includes("violates row-level security");
      
      supabaseStatus.connected = true;
      if (isRls) {
        supabaseStatus.tableExists = true;
        supabaseStatus.rlsEnabled = true;
      } else {
        const isMissingTable = error.code === "PGRST205" || error.message.includes("Could not find the table");
        supabaseStatus.tableExists = !isMissingTable;
        supabaseStatus.rlsEnabled = false;
      }
      supabaseStatus.error = error.message;
    } else {
      supabaseStatus.connected = true;
      supabaseStatus.tableExists = true;
      supabaseStatus.rlsEnabled = false;
      supabaseStatus.error = "";
    }
  } catch (err: any) {
    console.warn("Exception ao salvar no Supabase:", err.message);
    const isRls = err.message.includes("violates row-level security") || err.message.includes("42501");
    supabaseStatus.connected = false;
    supabaseStatus.rlsEnabled = isRls;
    supabaseStatus.error = err.message;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(supabaseSessionMiddleware);

  // API - Get entire state (Contract, Works, Logs)
  app.get("/api/contract", async (req, res) => {
    const data = await getDatabaseState();
    res.json(data);
  });

  // API - Reset DB to default template
  app.post("/api/contract/reset", async (req, res) => {
    await saveDatabaseState(defaultData);
    res.json({ message: "Dados restaurados para o padrão original.", data: { ...defaultData, supabaseStatus } });
  });

  // API - Update overall contract information
  app.post("/api/contract/settings", async (req, res) => {
    const { contractName, supervisorCompany, contractValue, contractStartDate, contractEndDate, contractAdditives } = req.body;
    if (!contractName || !supervisorCompany) {
      return res.status(400).json({ error: "Nome de contrato e empresa supervisora são obrigatórios." });
    }
    const data = await getDatabaseState();
    data.contractName = contractName;
    data.supervisorCompany = supervisorCompany;
    if (contractValue !== undefined) data.contractValue = Number(contractValue);
    if (contractStartDate !== undefined) data.contractStartDate = contractStartDate;
    if (contractEndDate !== undefined) data.contractEndDate = contractEndDate;
    if (contractAdditives !== undefined) data.contractAdditives = contractAdditives;

    const { supabaseStatus: _, ...cleanData } = data;
    await saveDatabaseState(cleanData);
    res.json({ message: "Contrato atualizado com sucesso.", data });
  });

  // API - Create new public work
  app.post("/api/works", async (req, res) => {
    const {
      name,
      contractNumber,
      startDate,
      deadlineDate,
      activeContractDate,
      progress,
      contractorName,
      biddedValue,
      status,
      creatorName,
      creatorRole
    } = req.body;

    if (!name || !contractNumber || !startDate || !deadlineDate || !activeContractDate || !contractorName || !biddedValue) {
      return res.status(400).json({ error: "Todos os campos da obra são obrigatórios." });
    }

    const data = await getDatabaseState();
    const newObra: Obra = {
      id: "obra-" + Date.now(),
      name,
      contractNumber,
      startDate,
      deadlineDate,
      activeContractDate,
      progress: Number(progress) || 0,
      contractorName,
      biddedValue: Number(biddedValue),
      status: status || "planejamento",
      biddingNumber: req.body.biddingNumber,
      adminProcess: req.body.adminProcess,
      termDaysVigencia: req.body.termDaysVigencia,
      termDaysExecucao: req.body.termDaysExecucao,
      signingDate: req.body.signingDate,
      publicationDateJom: req.body.publicationDateJom,
      physicalStartDate: req.body.physicalStartDate,
      startOrderDate: req.body.startOrderDate,
      additives: req.body.additives || [],
    };

    data.works.push(newObra);

    // Log the action
    const newLog: UpdateLog = {
      id: "log-" + Date.now(),
      workId: newObra.id,
      workName: newObra.name,
      userName: creatorName || "Usuário Anônimo",
      userRole: creatorRole || "Colaborador",
      timestamp: new Date().toISOString(),
      oldProgress: 0,
      newProgress: newObra.progress,
      notes: `Inseriu uma nova obra pública: "${newObra.name}" ao contrato.`
    };
    data.logs.unshift(newLog);

    const { supabaseStatus: _, ...cleanData } = data;
    await saveDatabaseState(cleanData);
    res.status(201).json({ message: "Obra adicionada com sucesso.", obra: newObra });
  });

  // API - Update/Modify work or progress measurement
  app.put("/api/works/:id", async (req, res) => {
    const { id } = req.params;
    const {
      name,
      contractNumber,
      startDate,
      deadlineDate,
      activeContractDate,
      progress,
      contractorName,
      biddedValue,
      status,
      updaterName,
      updaterRole,
      updateNotes
    } = req.body;

    const data = await getDatabaseState();
    const obraIndex = data.works.findIndex((w) => w.id === id);
    if (obraIndex === -1) {
      return res.status(404).json({ error: "Obra não encontrada." });
    }

    const oldObra = data.works[obraIndex];
    const originalProgress = oldObra.progress;
    const nextProgress = progress !== undefined ? Number(progress) : originalProgress;

    const updatedObra: Obra = {
      ...oldObra,
      name: name || oldObra.name,
      contractNumber: contractNumber || oldObra.contractNumber,
      startDate: startDate || oldObra.startDate,
      deadlineDate: deadlineDate || oldObra.deadlineDate,
      activeContractDate: activeContractDate || oldObra.activeContractDate,
      progress: nextProgress,
      contractorName: contractorName || oldObra.contractorName,
      biddedValue: biddedValue !== undefined ? Number(biddedValue) : oldObra.biddedValue,
      status: status || oldObra.status,
      biddingNumber: req.body.biddingNumber !== undefined ? req.body.biddingNumber : oldObra.biddingNumber,
      adminProcess: req.body.adminProcess !== undefined ? req.body.adminProcess : oldObra.adminProcess,
      termDaysVigencia: req.body.termDaysVigencia !== undefined ? req.body.termDaysVigencia : oldObra.termDaysVigencia,
      termDaysExecucao: req.body.termDaysExecucao !== undefined ? req.body.termDaysExecucao : oldObra.termDaysExecucao,
      signingDate: req.body.signingDate !== undefined ? req.body.signingDate : oldObra.signingDate,
      publicationDateJom: req.body.publicationDateJom !== undefined ? req.body.publicationDateJom : oldObra.publicationDateJom,
      physicalStartDate: req.body.physicalStartDate !== undefined ? req.body.physicalStartDate : oldObra.physicalStartDate,
      startOrderDate: req.body.startOrderDate !== undefined ? req.body.startOrderDate : oldObra.startOrderDate,
      additives: req.body.additives !== undefined ? req.body.additives : oldObra.additives,
      timelineImage: req.body.timelineImage !== undefined ? req.body.timelineImage : oldObra.timelineImage,
    };

    data.works[obraIndex] = updatedObra;

    // Log the change
    let noteText = updateNotes || "Ficha técnica e informações da obra atualizadas.";
    if (originalProgress !== nextProgress) {
      noteText = updateNotes || `Lançamento de medição física. Avanço saltou de ${originalProgress}% para ${nextProgress}%.`;
    }

    const newLog: UpdateLog = {
      id: "log-" + Date.now(),
      workId: id,
      workName: updatedObra.name,
      userName: updaterName || "Usuário Anônimo",
      userRole: updaterRole || "Colaborador",
      timestamp: new Date().toISOString(),
      oldProgress: originalProgress,
      newProgress: nextProgress,
      notes: noteText,
      coverImage: req.body.coverImage || undefined,
      progressImages: req.body.progressImages || undefined
    };
    data.logs.unshift(newLog);

    const { supabaseStatus: _, ...cleanData } = data;
    await saveDatabaseState(cleanData);
    res.json({ message: "Obra atualizada com sucesso.", obra: updatedObra });
  });

  // API - Update specific update log notes
  app.put("/api/logs/:id", async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;

    const data = await getDatabaseState();
    const logIndex = data.logs.findIndex((l) => l.id === id);
    if (logIndex === -1) {
      return res.status(404).json({ error: "Lançamento não encontrado." });
    }

    data.logs[logIndex].notes = notes;

    const { supabaseStatus: _, ...cleanData } = data;
    await saveDatabaseState(cleanData);
    res.json({ message: "Lançamento atualizado com sucesso.", log: data.logs[logIndex] });
  });

  // API - Delete standard work
  app.delete("/api/works/:id", async (req, res) => {
    const { id } = req.params;
    const { deleterName, deleterRole } = req.query;

    const data = await getDatabaseState();
    const obra = data.works.find((w) => w.id === id);
    if (!obra) {
      return res.status(404).json({ error: "Obra não encontrada." });
    }

    data.works = data.works.filter((w) => w.id !== id);

    // Create log for deletion
    const newLog: UpdateLog = {
      id: "log-" + Date.now(),
      workId: id,
      workName: obra.name,
      userName: String(deleterName || "Usuário Anônimo"),
      userRole: String(deleterRole || "Colaborador"),
      timestamp: new Date().toISOString(),
      oldProgress: obra.progress,
      newProgress: 0,
      notes: `Excluiu a obra pública "${obra.name}" do contrato.`
    };
    data.logs.unshift(newLog);

    const { supabaseStatus: _, ...cleanData } = data;
    await saveDatabaseState(cleanData);
    res.json({ message: "Obra excluída com sucesso." });
  });

  // Serve static assets and routing in production or proxy to Vite in dev
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on http://localhost:${PORT}`);
  });
}

startServer();
