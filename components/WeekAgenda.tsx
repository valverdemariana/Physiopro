"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/** ===================== Helpers de Data ===================== */
const TZ = "America/Sao_Paulo";

function toLocal(d: string | Date) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Date(dt);
}
function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function startOfWeekBR(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0=dom,1=seg,...
  const diff = (day === 0 ? -6 : 1 - day); // segunda como início
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfMonth(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfMonth(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}
function startOfCalendarGrid(date = new Date()) {
  // início do mês → volta até segunda-feira anterior
  const first = startOfMonth(date);
  const day = first.getDay(); // 0 dom, 1 seg...
  const back = (day === 0 ? 6 : day - 1);
  return addDays(first, -back);
}
function endOfCalendarGrid(date = new Date()) {
  // fim do mês → avança até domingo
  const last = endOfMonth(date);
  const day = last.getDay(); // 0 dom, 1 seg...
  const fwd = (day === 0 ? 0 : 7 - day);
  const end = addDays(last, fwd);
  end.setHours(23, 59, 59, 999);
  return end;
}

function fmtDayHeader(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}
function fmtDayNumber(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
function fmtMonthTitle(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
function fmtTimeBR(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

/** ===================== Tipos ===================== */
type Sessao = {
  id: string;
  data: string; // ISO
  tipo?: string | null;
  status?: string | null;
  paciente_id: string;
  paciente_nome?: string;
};

type DayBucket = {
  date: Date;
  items: Sessao[];
};

type Props = {
  /** 'week' (padrão) ou 'month' */
  view?: "week" | "month";
  /** 'light' (padrão) ou 'dark' */
  theme?: "light" | "dark";
  /** Habilita scroll horizontal no modo semana em telas pequenas */
  mobileScroll?: boolean;
};

/** ===================== Componente ===================== */
export default function WeekAgenda({ view = "week", theme = "light", mobileScroll = true }: Props) {
  // 'refDate' é a âncora da navegação: início da semana OU mês visível
  const [refDate, setRefDate] = useState<Date>(() =>
    view === "week" ? startOfWeekBR(new Date()) : startOfMonth(new Date())
  );

  // recalibra âncora quando a visualização muda
  useEffect(() => {
    setRefDate(view === "week" ? startOfWeekBR(new Date()) : startOfMonth(new Date()));
  }, [view]);

  // intervalo visível
  const range = useMemo(() => {
    if (view === "week") {
      const start = startOfWeekBR(refDate);
      const end = addDays(start, 7);
      const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
      return { start, end, days };
    } else {
      const start = startOfCalendarGrid(refDate);
      const end = endOfCalendarGrid(refDate);
      const days: Date[] = [];
      let cursor = new Date(start);
      while (cursor <= end) {
        days.push(new Date(cursor));
        cursor = addDays(cursor, 1);
      }
      return { start, end, days };
    }
  }, [refDate, view]);

  const [loading, setLoading] = useState(true);
  const [buckets, setBuckets] = useState<DayBucket[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  /** carrega sessões do intervalo, obtendo nome do paciente via JOIN ou fallback */
  const load = async () => {
    setErro(null);
    setLoading(true);

    let query = supabase
      .from("sessoes")
      .select("id,data,tipo,status,paciente_id, pacientes!inner(id,nome)")
      .gte("data", range.start.toISOString())
      .lt("data", range.end.toISOString())
      .neq("status", "cancelado")
      .order("data", { ascending: true }) as any;

    let { data, error } = await query;

    // Fallback se relacionamento não estiver mapeado
    if (
      error?.message?.toLowerCase().includes("relationship") ||
      error?.message?.toLowerCase().includes("foreign")
    ) {
      const { data: ses, error: e1 } = await supabase
        .from("sessoes")
        .select("id,data,tipo,status,paciente_id")
        .gte("data", range.start.toISOString())
        .lt("data", range.end.toISOString())
        .neq("status", "cancelado")
        .order("data", { ascending: true });

      if (e1) {
        setErro(e1.message);
        setLoading(false);
        return;
      }
      const ids = Array.from(new Set((ses || []).map((s) => s.paciente_id)));
      let mapa: Record<string, string> = {};
      if (ids.length) {
        const { data: pacs } = await supabase
          .from("pacientes")
          .select("id,nome")
          .in("id", ids);
        (pacs || []).forEach((p) => (mapa[p.id] = p.nome));
      }
      data = (ses || []).map((s) => ({
        ...s,
        pacientes: { id: s.paciente_id, nome: mapa[s.paciente_id] || "Paciente" },
      }));
      error = null;
    }

    if (error) {
      setErro(error.message);
      setLoading(false);
      return;
    }

    const groups: DayBucket[] = range.days.map((d) => ({ date: d, items: [] }));
    (data || []).forEach((row: any) => {
      const when = toLocal(row.data);
      const key = when.toDateString();
      const idx = groups.findIndex((g) => g.date.toDateString() === key);
      const item: Sessao = {
        id: row.id,
        data: row.data,
        tipo: row.tipo,
        status: row.status,
        paciente_id: row.paciente_id,
        paciente_nome: row.pacientes?.nome || "Paciente",
      };
      if (idx >= 0) groups[idx].items.push(item);
    });

    setBuckets(groups);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refDate, view]);

  // Navegação
  const next = () => setRefDate(view === "week" ? addDays(refDate, 7) : addDays(refDate, 32));
  const prev = () => setRefDate(view === "week" ? addDays(refDate, -7) : addDays(refDate, -32));
  const today = () => setRefDate(view === "week" ? startOfWeekBR(new Date()) : startOfMonth(new Date()));

  // classes de tema locais (sem depender de darkMode do Tailwind)
  const themeBox =
    theme === "dark"
      ? "bg-[#0f172a] text-[#e5e7eb]" // slate-900 / zinc-200
      : "bg-white text-textmain";

  const subText = theme === "dark" ? "text-[#a1a1aa]" : "text-textsec";
  const pillBg = theme === "dark" ? "bg-white/10 hover:bg-white/15" : "bg-uppli/5 hover:bg-uppli/10";
  const cardBg = theme === "dark" ? "bg-white/5" : "bg-white";

  return (
    <div className="space-y-3">
      {/* Cabeçalho da faixa temporal */}
      <div className="flex items-center justify-between">
        <div className="font-semibold">
          {view === "week"
            ? `Semana de ${fmtDayNumber(range.days[0])} a ${fmtDayNumber(range.days[range.days.length - 1])}`
            : fmtMonthTitle(refDate)}
        </div>
        <div className="flex gap-2">
          <button className={`badge ${theme === "dark" ? "bg-white/10" : ""}`} onClick={prev}>◀</button>
          <button className="badge" onClick={today}>Hoje</button>
          <button className={`badge ${theme === "dark" ? "bg-white/10" : ""}`} onClick={next}>▶</button>
        </div>
      </div>

      {/* Grade de dias */}
      {view === "week" ? (
        <div className={mobileScroll ? "overflow-x-auto" : ""}>
          <div className="min-w-[800px] grid grid-cols-7 gap-2">
            {buckets.map((b) => {
              const isToday = new Date().toDateString() === b.date.toDateString();
              return (
                <div key={b.date.toISOString()} className={`card ${themeBox}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-sm ${subText}`}>{fmtDayHeader(b.date)}</div>
                    <div className={`text-sm font-semibold ${isToday ? "text-uppli" : ""}`}>
                      {fmtDayNumber(b.date)}
                    </div>
                  </div>

                  {loading ? (
                    <div className={`small ${subText}`}>Carregando…</div>
                  ) : b.items.length === 0 ? (
                    <div className={`small ${subText}`}>Sem consultas</div>
                  ) : (
                    <div className="space-y-1">
                      {b.items.map((it) => {
                        const clock = fmtTimeBR(toLocal(it.data));
                        return (
                          <a
                            key={it.id}
                            href={`/pacientes/${it.paciente_id}`}
                            className={`block rounded-xl px-3 py-2 ${pillBg} transition`}
                            title={`${it.paciente_nome} • ${clock}`}
                          >
                            <div className="text-[13px] font-medium truncate">
                              {it.paciente_nome}
                            </div>
                            <div className={`text-[12px] ${subText}`}>
                              {clock} {it.tipo ? `• ${it.tipo}` : ""}
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // MÊS: 7 colunas com todas as semanas que cobrem o mês
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {buckets.map((b) => {
            const isToday = new Date().toDateString() === b.date.toDateString();
            const inMonth = b.date.getMonth() === refDate.getMonth();
            return (
              <div key={b.date.toISOString()} className={`rounded-2xl p-3 shadow-soft ${cardBg} ${theme === "dark" ? "shadow-none ring-1 ring-white/10" : ""}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={`text-sm ${subText}`}>{fmtDayHeader(b.date)}</div>
                  <div className={`text-sm font-semibold ${isToday ? "text-uppli" : inMonth ? "" : subText}`}>
                    {fmtDayNumber(b.date)}
                  </div>
                </div>

                {loading ? (
                  <div className={`small ${subText}`}>Carregando…</div>
                ) : b.items.length === 0 ? (
                  <div className={`small ${subText}`}>—</div>
                ) : (
                  <div className="space-y-1">
                    {b.items.map((it) => {
                      const clock = fmtTimeBR(toLocal(it.data));
                      return (
                        <a
                          key={it.id}
                          href={`/pacientes/${it.paciente_id}`}
                          className={`block rounded-xl px-3 py-2 ${pillBg} transition`}
                          title={`${it.paciente_nome} • ${clock}`}
                        >
                          <div className="text-[13px] font-medium truncate">
                            {it.paciente_nome}
                          </div>
                          <div className={`text-[12px] ${subText}`}>
                            {clock} {it.tipo ? `• ${it.tipo}` : ""}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {erro && <div className="small text-red-600">Erro: {erro}</div>}
    </div>
  );
}
