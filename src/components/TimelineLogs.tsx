import { UpdateLog } from "../types";
import { formatDate } from "../utils";
import { History, ArrowRight, UserCheck, CheckCircle2, Trash2, Plus, MessageSquare } from "lucide-react";

interface TimelineLogsProps {
  logs: UpdateLog[];
}

export default function TimelineLogs({ logs }: TimelineLogsProps) {
  
  // Format dynamic relative time or detailed time
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHrs = Math.floor(diffMs / 3600000);
      const diffMins = Math.floor((diffMs % 3600000) / 60000);

      if (diffHrs === 0 && diffMins < 60) {
        if (diffMins <= 1) return "Agora mesmo";
        return `Há ${diffMins} minutos`;
      }
      if (diffHrs < 24) {
        return `Há ${diffHrs} ${diffHrs === 1 ? "hora" : "horas"}`;
      }
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "-";
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-4" id="timeline-logs-sec">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-slate-700" />
          <h2 className="text-base md:text-lg font-bold text-slate-800">
            Histórico de Atualizações & Medições
          </h2>
        </div>
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-bold">
          {logs.length} registros
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          Nenhuma alteração registrada ainda. As atualizações serão exibidas em tempo real aqui.
        </div>
      ) : (
        <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
          {logs.map((log, index) => {
            const isProgressChange = log.oldProgress !== log.newProgress;
            const progressDelta = log.newProgress - log.oldProgress;

            return (
              <div 
                key={log.id} 
                className="relative pb-1 last:pb-0 flex gap-3 group"
                id={`log-item-${log.id}`}
              >
                {/* Timeline vertical connector line */}
                {index < logs.length - 1 && (
                  <span className="absolute left-4 top-8 bottom-0 w-0.5 bg-slate-100 group-hover:bg-slate-200 transition-colors" />
                )}

                {/* Left side bullet point */}
                <span className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 z-10">
                  {isProgressChange ? (
                    <TrendingUpIndicator delta={progressDelta} />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </span>

                {/* Right side notification card bubble */}
                <div className="flex-grow bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-2 hover:bg-slate-50/80 transition shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-800">
                      {log.userName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-medium">
                      {formatTime(log.timestamp)}
                    </span>
                  </div>

                  <span className="block text-[11px] font-mono text-slate-500 lowercase bg-slate-200/50 rounded-lg px-2 py-0.5 self-start w-fit">
                    {log.userRole || "Colaborador"}
                  </span>

                  <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">
                    {log.notes}
                  </p>

                  {/* Work Target Indicator */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-600 truncate max-w-[180px]">
                      Obra: <strong className="text-slate-800 font-bold">{log.workName}</strong>
                    </span>

                    {/* Progress details indicator */}
                    {isProgressChange && (
                      <div className="flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono font-medium text-[10px]">
                        <span className="text-slate-500">{log.oldProgress}%</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-800 font-bold">{log.newProgress}%</span>
                        <span className={`font-extrabold ml-1 ${progressDelta > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          ({progressDelta > 0 ? "+" : ""}{progressDelta}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// Spark delta bullet decorator helper
function TrendingUpIndicator({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Avanço de Obra" />
    );
  }
  return <span className="w-2.5 h-2.5 rounded-full bg-rose-500" title="Ajuste Progressivo" />;
}
