import React, { useState } from "react";
import { X, Calendar, CheckCircle, ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { UpdateLog } from "../types";

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (weeks: string[]) => void;
  reportWeek: string;
  setReportWeek: (week: string) => void;
  logs: UpdateLog[];
}

// Helper to parse "Período: DD/MM/YYYY a DD/MM/YYYY" from notes
function parsePeriodDates(notes: string) {
  if (!notes) return null;
  const periodMatch = notes.match(/(?:Período|Period):\s*\*?(\d{2})\/(\d{2})\/(\d{4})\s+a\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  if (periodMatch) {
    const start = new Date(parseInt(periodMatch[3]), parseInt(periodMatch[2]) - 1, parseInt(periodMatch[1]));
    const end = new Date(parseInt(periodMatch[6]), parseInt(periodMatch[5]) - 1, parseInt(periodMatch[4]));
    return { start, end };
  }
  return null;
}

// Helper to get ISO week string "YYYY-Www"
function getISOWeekString(date: Date): string {
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
}

// Helper to get Monday and Friday of a week
function getDatesOfISOWeek(w: string) {
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
}

export default function WeeklyReportModal({ 
  isOpen, 
  onClose, 
  onGenerate, 
  reportWeek, 
  setReportWeek,
  logs = []
}: WeeklyReportModalProps) {
  const [selectedWeek, setSelectedWeek] = useState(reportWeek);

  // Extract weeks and group them by year
  const activeWeeks = React.useMemo(() => {
    const weeksMap = new Map<string, { value: string; start: Date; end: Date; count: number }>();

    logs.forEach(log => {
      let logDate = new Date(log.timestamp);
      const parsed = parsePeriodDates(log.notes);
      if (parsed) {
        logDate = parsed.start;
      }
      
      const weekStr = getISOWeekString(logDate);
      const dates = getDatesOfISOWeek(weekStr);
      if (dates) {
        const existing = weeksMap.get(weekStr);
        if (existing) {
          existing.count += 1;
        } else {
          weeksMap.set(weekStr, {
            value: weekStr,
            start: dates.monday,
            end: dates.friday,
            count: 1
          });
        }
      }
    });

    // Always ensure current week is available as option
    const currentWeekStr = getISOWeekString(new Date());
    if (!weeksMap.has(currentWeekStr)) {
      const dates = getDatesOfISOWeek(currentWeekStr);
      if (dates) {
        weeksMap.set(currentWeekStr, {
          value: currentWeekStr,
          start: dates.monday,
          end: dates.friday,
          count: 0
        });
      }
    }

    // Convert map to array and sort descending (newest weeks first)
    const sorted = Array.from(weeksMap.values())
      .sort((a, b) => b.value.localeCompare(a.value))
      .map(w => {
        const startFormatted = w.start.toLocaleDateString("pt-BR");
        const endFormatted = w.end.toLocaleDateString("pt-BR");
        
        const parts = w.value.split("-W");
        const weekNum = parseInt(parts[1], 10);
        const year = parts[0];
        
        return {
          value: w.value,
          year,
          weekNum,
          label: `Semana ${weekNum} — [${startFormatted} a ${endFormatted}]`,
          count: w.count,
          startFormatted,
          endFormatted
        };
      });

    return sorted;
  }, [logs]);

  // Pre-select the first option if reportWeek is empty or not in options
  React.useEffect(() => {
    if (activeWeeks.length > 0) {
      if (!reportWeek || !activeWeeks.some(w => w.value === reportWeek)) {
        // Set it to the first active week with activities, or just the first in list (newest)
        const withActivities = activeWeeks.find(w => w.count > 0);
        const fallback = withActivities || activeWeeks[0];
        setSelectedWeek(fallback.value);
        setReportWeek(fallback.value);
      } else {
        setSelectedWeek(reportWeek);
      }
    }
  }, [activeWeeks, reportWeek, setReportWeek]);

  const groupedByYear = React.useMemo(() => {
    const groups: Record<string, typeof activeWeeks> = {};
    activeWeeks.forEach(w => {
      if (!groups[w.year]) {
        groups[w.year] = [];
      }
      groups[w.year].push(w);
    });
    return groups;
  }, [activeWeeks]);

  const years = React.useMemo(() => {
    return Object.keys(groupedByYear).sort((a, b) => b.localeCompare(a));
  }, [groupedByYear]);

  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>(() => {
    // Expand the most recent year by default
    const defaultObj: Record<string, boolean> = {};
    if (activeWeeks.length > 0) {
      defaultObj[activeWeeks[0].year] = true;
    }
    return defaultObj;
  });

  const toggleYear = (year: string) => {
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            Selecione as semanas (Cascatas)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer p-1 rounded hover:bg-slate-800 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-[11px] text-slate-450 leading-tight">
          Escolha uma semana que possua lançamentos de atividades de fiscalização. As opções são organizadas por ano em formato de cascata.
        </p>

        {/* Dynamic grouped cascade week listing */}
        <div className="max-h-72 overflow-y-auto pr-1 space-y-2 border border-slate-800 rounded-xl p-2 bg-slate-950/50">
          {years.map(year => {
            const isExpanded = expandedYears[year];
            const weeksInYear = groupedByYear[year];
            
            return (
              <div key={year} className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/40">
                <button
                  type="button"
                  onClick={() => toggleYear(year)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-900 hover:bg-slate-850 transition text-xs font-bold text-slate-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <Folder className="w-4 h-4 text-slate-500" />}
                    <span>Ano {year}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({weeksInYear.length} semanas)</span>
                  </div>
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                
                {isExpanded && (
                  <div className="p-1.5 space-y-1 bg-slate-950/20 border-t border-slate-850">
                    {weeksInYear.map(w => {
                      const isSelected = selectedWeek === w.value;
                      return (
                        <button
                          key={w.value}
                          type="button"
                          onClick={() => {
                            setSelectedWeek(w.value);
                            setReportWeek(w.value);
                          }}
                          className={`w-full text-left p-2.5 rounded-lg transition-all text-xs flex flex-col gap-1 cursor-pointer border ${
                            isSelected
                              ? "bg-amber-500/10 border-amber-500 text-white"
                              : "bg-slate-900/60 border-slate-800 hover:border-slate-750 text-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold">Semana {w.weekNum}</span>
                            {isSelected && <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm" />}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>{w.startFormatted} a {w.endFormatted}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              w.count > 0 
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" 
                                : "bg-slate-800 text-slate-500"
                            }`}>
                              {w.count} {w.count === 1 ? 'boletim' : 'boletins'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-slate-400 leading-tight">
          O relatório consolidará as atividades das obras ativas apenas nos dias úteis (segunda a sexta-feira) das semanas selecionadas.
        </p>

        <button
          onClick={() => {
            if (selectedWeek) {
              onGenerate([selectedWeek]);
              onClose();
            }
          }}
          disabled={!selectedWeek}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Gerar Relatório Consolidado
        </button>
      </div>
    </div>
  );
}
