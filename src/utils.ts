export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function formatDate(dateString: string): string {
  if (!dateString) return "-";
  const [year, month, day] = dateString.split("-");
  if (year && month && day) {
    return `${day}/${month}/${year}`;
  }
  return new Date(dateString).toLocaleDateString("pt-BR");
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "planejamento":
      return "Planejamento";
    case "em_andamento":
      return "Em Andamento";
    case "paralisada":
      return "Paralisada";
    case "concluida":
      return "Concluída";
    default:
      return status;
  }
}

export function getStatusColor(status: string): { bg: string; text: string; dot: string } {
  switch (status) {
    case "planejamento":
      return {
        bg: "bg-blue-50 text-blue-700 border border-blue-200",
        text: "text-blue-700",
        dot: "bg-blue-500"
      };
    case "em_andamento":
      return {
        bg: "bg-amber-50 text-amber-700 border border-amber-200",
        text: "text-amber-700",
        dot: "bg-amber-500"
      };
    case "paralisada":
      return {
        bg: "bg-rose-50 text-rose-700 border border-rose-200",
        text: "text-rose-700",
        dot: "bg-rose-500"
      };
    case "concluida":
      return {
        bg: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        text: "text-emerald-700",
        dot: "bg-emerald-500"
      };
    default:
      return {
        bg: "bg-slate-50 text-slate-700 border border-slate-200",
        text: "text-slate-700",
        dot: "bg-slate-500"
      };
  }
}
