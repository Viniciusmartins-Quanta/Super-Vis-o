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
  order?: number;
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

// No longer needed

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

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required");
}
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const supabaseStatus = {
  connected: false,
  tableExists: false,
  rlsEnabled: false,
  error: "Não inicializado"
};


// No longer needed

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
      return { ...defaultData, supabaseStatus };
    }

    supabaseStatus.connected = true;
    supabaseStatus.tableExists = true;
    supabaseStatus.rlsEnabled = false;
    supabaseStatus.error = "";

    if (!data) {
      console.log("Tabela do Supabase encontrada mas vazia. Inicializando com dados padrão...");
      await saveDatabaseState(defaultData);
      return { ...defaultData, supabaseStatus };
    }

    return { ...(data.data as Database), supabaseStatus };
  } catch (err: any) {
    console.warn("Exception ao conectar com Supabase:", err.message);
    const isRls = err.message.includes("violates row-level security") || err.message.includes("42501");
    supabaseStatus.connected = false;
    supabaseStatus.tableExists = !err.message.includes("PGRST205");
    supabaseStatus.rlsEnabled = isRls;
    supabaseStatus.error = err.message;
    return { ...defaultData, supabaseStatus };
  }
}

async function saveDatabaseState(data: Database): Promise<void> {
  try {
    const { error } = await supabase
      .from("contract_state")
      .upsert({ id: "current_state", data: data, updated_at: new Date().toISOString() });

    if (error) {
      console.warn("Erro ao persistir no Supabase:", error.message);
      throw new Error(`Erro ao salvar no Supabase: ${error.message}`);
    }
  } catch (err: any) {
    console.error("Exception ao salvar no Supabase:", err.message);
    throw err;
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

  // API - Read Work Data from Image using Gemini AI
  // API - Image analysis removed




      // Split base64 more robustly
      const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      };

      const promptText = "Analise esta imagem de documento público de engenharia (como contrato, extrato do diário oficial, termo aditivo, convênio, ordem de serviço, etc.) e extraia todas as informações necessárias para cadastrar uma nova obra civil. Preencha os campos de acordo com o esquema solicitado. Se alguma informação não estiver presente, retorne vazio ou nulo.";

      let response;
      const schemaConfig = {
        systemInstruction: "Você é um robô de leitura inteligente de documentos de licitação e contratos de obras de engenharia. Seu objetivo é identificar e retornar os dados estruturados em JSON de acordo com o esquema: name (título da obra), contractNumber (número do contrato), contractorName (empresa vencedora), biddingNumber (concorrência pública nº), adminProcess (processo administrativo nº), biddedValue (valor contratual inicial como número), termDaysVigencia (prazo vigência ex: '12 meses'), termDaysExecucao (prazo execução ex: '12 meses'), signingDate (data de assinatura como YYYY-MM-DD), publicationDateJom (data de publicação como YYYY-MM-DD), physicalStartDate (data de início física como YYYY-MM-DD), startOrderDate (data da ordem de início como YYYY-MM-DD), status (um destes: 'planejamento', 'em_andamento', 'paralisada', 'concluida') e progress (um inteiro de 0 a 100).",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            contractNumber: { type: Type.STRING },
            contractorName: { type: Type.STRING },
            biddingNumber: { type: Type.STRING },
            adminProcess: { type: Type.STRING },
            biddedValue: { type: Type.NUMBER },
            termDaysVigencia: { type: Type.STRING },
            termDaysExecucao: { type: Type.STRING },
            signingDate: { type: Type.STRING },
            publicationDateJom: { type: Type.STRING },
            physicalStartDate: { type: Type.STRING },
            startOrderDate: { type: Type.STRING },
            status: { type: Type.STRING },
            progress: { type: Type.INTEGER },
          }
        }
      };

      try {
        console.log("Tentando analisar imagem com gemini-3.5-flash...");
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: { parts: [imagePart, { text: promptText }] },
          config: schemaConfig
        });
      } catch (err35: any) {
        console.warn("Erro ao usar gemini-3.5-flash, tentando gemini-2.5-flash como fallback. Erro:", err35.message || err35);
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: { parts: [imagePart, { text: promptText }] },
          config: schemaConfig
        });
      }

      let resultText = response.text;
      if (!resultText) {
        throw new Error("Não foi possível ler as informações da imagem.");
      }

      // Safe JSON cleaning
      let cleanText = resultText.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();

      const parsedData = JSON.parse(cleanText);
      res.json(parsedData);


  // API - Custom Gemini Chat Request Endpoint
  app.post("/api/chat", async (req, res) => {
    const { mensagemDoUsuario } = req.body;
    if (!mensagemDoUsuario) {
      return res.status(400).json({ error: "O campo 'mensagemDoUsuario' é obrigatório." });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: "A chave de API do Gemini (GEMINI_API_KEY) não está configurada no servidor." });
    }

    try {
      const client = new GoogleGenAI({
        apiKey: geminiApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: mensagemDoUsuario,
      });

      res.json({ respostaDaIA: response.text });
    } catch (erro: any) {
      console.error("Erro na integração com Gemini:", erro);
      res.status(500).json({ erro: "Falha ao conectar com a IA." });
    }
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

  // API - Reorder all works
  app.put("/api/works-reorder", async (req, res) => {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: "orderedIds deve ser um array." });
    }

    const data = await getDatabaseState();
    data.works = data.works.map(w => {
      const idx = orderedIds.indexOf(w.id);
      return {
        ...w,
        order: idx !== -1 ? idx : (w.order ?? 999)
      };
    }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const { supabaseStatus: _, ...cleanData } = data;
    await saveDatabaseState(cleanData);
    res.json({ message: "Ordem redefinida com sucesso.", works: data.works });
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

  // API - Update specific update log notes/fields
  app.put("/api/logs/:id", async (req, res) => {
    const { id } = req.params;
    const { notes, newProgress, coverImage, progressImages } = req.body;

    const data = await getDatabaseState();
    const logIndex = data.logs.findIndex((l) => l.id === id);
    if (logIndex === -1) {
      return res.status(404).json({ error: "Lançamento não encontrado." });
    }

    const log = data.logs[logIndex];
    if (notes !== undefined) log.notes = notes;
    if (newProgress !== undefined) log.newProgress = Number(newProgress);
    if (coverImage !== undefined) log.coverImage = coverImage;
    if (progressImages !== undefined) log.progressImages = progressImages;

    // Check if this log is the most recent one for its workId to sync work's progress
    const workId = log.workId;
    const workLogs = data.logs.filter((l) => l.workId === workId);
    const sortedLogs = [...workLogs].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (sortedLogs[0]?.id === id) {
      const obraIndex = data.works.findIndex((w) => w.id === workId);
      if (obraIndex !== -1 && newProgress !== undefined) {
        data.works[obraIndex].progress = Number(newProgress);
      }
    }

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

  app.delete("/api/logs/:id", async (req, res) => {
    const { id } = req.params;
    const data = await getDatabaseState();
    const logIndex = data.logs.findIndex((l) => l.id === id);
    if (logIndex === -1) {
      return res.status(404).json({ error: "Boletim não encontrado." });
    }
    data.logs.splice(logIndex, 1);
    const { supabaseStatus: _, ...cleanData } = data;
    await saveDatabaseState(cleanData);
    res.json({ message: "Boletim excluído com sucesso." });
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

