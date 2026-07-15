export function formatCurrency(value: number | undefined): string {
  if (value === undefined || isNaN(value)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr + "T12:00:00");
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
}

export interface ParsedReport {
  isWeeklyReport: boolean;
  title?: string;
  period?: string;
  progress?: string;
  aditivoStatus?: string;
  infraStatus?: string;
  enelStatus?: string;
  substationStatus?: string;
  relevantInfo?: string;
  weeklyActivities: string[];
  nextWeekActivities: string[];
  importantNotes: string[];
}

export function parseWeeklyReport(notes: string | undefined): ParsedReport {
  if (!notes) {
    return { isWeeklyReport: false, weeklyActivities: [], nextWeekActivities: [], importantNotes: [] };
  }

  // Check if it looks like our structured weekly report
  if (!notes.includes("RELATÓRIO DE ATIVIDADES DE SUPERVISÃO")) {
    return { isWeeklyReport: false, weeklyActivities: [], nextWeekActivities: [], importantNotes: [] };
  }

  const lines = notes.split("\n");
  const result: ParsedReport = {
    isWeeklyReport: true,
    weeklyActivities: [],
    nextWeekActivities: [],
    importantNotes: [],
  };

  let currentSection: "none" | "weekly" | "next" | "important" = "none";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect sections
    if (trimmed.includes("Atividades da Semana:")) {
      currentSection = "weekly";
      continue;
    } else if (trimmed.includes("Atividades da Próxima Semana:")) {
      currentSection = "next";
      continue;
    } else if (trimmed.includes("Observações & Apontamentos importantes:")) {
      currentSection = "important";
      continue;
    }

    // Detect headers and key-value properties
    if (trimmed.includes("RELATÓRIO DE ATIVIDADES")) {
      result.title = trimmed.replace(/[📋*]/g, "").trim();
      continue;
    } else if (trimmed.startsWith("*Período:") || trimmed.startsWith("Período:") || trimmed.includes("Período:")) {
      result.period = trimmed.replace(/[*📅]/g, "").replace(/Período:\s*/i, "").trim();
      continue;
    } else if (trimmed.includes("Avanço Físico:")) {
      result.progress = trimmed.replace(/[🔹*]/g, "").replace(/Avanço Físico:\s*/i, "").trim();
      continue;
    } else if (trimmed.includes("Situação do Aditivo:")) {
      result.aditivoStatus = trimmed.replace(/[🔹*]/g, "").replace(/Situação do Aditivo:\s*/i, "").trim();
      continue;
    } else if (trimmed.includes("Infraestrutura de Dados:")) {
      result.infraStatus = trimmed.replace(/[🔹*]/g, "").replace(/Atividades da Infraestrutura de Dados:\s*/i, "").trim();
      continue;
    } else if (trimmed.includes("Aumento de Carga (ENEL):")) {
      result.enelStatus = trimmed.replace(/[🔹*]/g, "").replace(/Status do Aumento de Carga \(ENEL\):\s*/i, "").trim();
      continue;
    } else if (trimmed.includes("Subestação Elétrica:")) {
      result.substationStatus = trimmed.replace(/[🔹*]/g, "").replace(/Status da Subestação Elétrica:\s*/i, "").trim();
      continue;
    } else if (trimmed.includes("Informação Relevante:")) {
      result.relevantInfo = trimmed.replace(/[🔹*]/g, "").replace(/Informação Relevante:\s*/i, "").trim();
      continue;
    }

    // Read list items
    if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
      const item = trimmed.replace(/^[•\-\*]\s*/, "").trim();
      if (item) {
        if (currentSection === "weekly") result.weeklyActivities.push(item);
        else if (currentSection === "next") result.nextWeekActivities.push(item);
        else if (currentSection === "important") result.importantNotes.push(item);
      }
    }
  }

  return result;
}
