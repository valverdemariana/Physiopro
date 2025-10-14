"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";

type Sessao = {
  id: string;
  data: string;           // ISO
  paciente_id: string | null;
  tipo?: string | null;
  status?: string | null;
};

type PacienteMap = Record<string, string>; // id -> nome

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function startOfNextDay(d: Date) {
  const n = new Date(d);
  n.setDate(n.getDate() + 1);
  return startOfDay(n);
}
function toISO(z: Date) {
  return z.toISOString();
}

export default function AgendaPage() {
  const sp = useSearchParams();

  // define a data inicial: ?date=YYYY-MM-DD ou ?view=today
  const initialDate = useMemo(() => {
    const v = sp.get("view");
    const d = sp.get("date");
    if (d) {
      // YYYY-MM-DD
      const [y, m, day] = d.split("-").map(Number);
      return new Date(y, (m || 1) - 1, day || 1);
    }
    if (v === "today") return new Date();
    return new Date(); // fallback hoje
  }, [sp]);

  const [dia, setDia] = useState<Date>(initialDate);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [pacientes, setPacientes] = useState<PacienteMap>({});
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureSession = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      window.location.href = "/login";
      return null;
    }
    return data.session;
  };

  const load = async () => {
    setErro(null);
    setLoading(true);

    const sess = await ensureSession();
    if (!sess) return;

    const ini = startOfDay(dia);
    const fim = startOfNextDay(dia);

    // busca sessões do dia
    const { data, error } = await supabase
      .from("sessoes")
      .select("id,data,paciente_id,tipo,status")
      .gte("data", toISO(ini))
      .lt("data", toISO(fim))
      .order("data", { ascending: true });

    if (error) {
      console.error(error);
      setErro(error.message);
      setSessoes([]);
      setLoading(false);
      return;
    }

    const list = (data || []) as Sessao[];
    setSessoes(list);

    // se quiser mostrar nome do paciente, busca nomes em lote
    const ids = Array.from(new Set(list.map(s => s.paciente_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: pacRows, error: pErr } = await supabase
        .from("pacientes")
        .select("id,nome")
        .in("id", ids);

      if (!pErr && pacRows) {
        const map: PacienteMap = {};
        for (const r of pacRows) map[r.id as string] = (r.nome as string) || "Paciente";
        setPacientes(map);
      }
    } else {
      setPacientes({});
    }

    setLoading(false);
  };

  useEffect(() => {
    setDia(initialDate); // se URL mudar, atualiza
  }, [initialDate]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dia]);

  const fmtDia = format(dia, "dd/MM/yyyy");

  const goPrev = () => {
    const n = new Date(dia);
    n.setDate(n.getDate() - 1);
    setDia(n);
  };
  const goNext = () => {
    const n = new Date(dia);
    n.setDate(n.getDate() + 1);
    setDia(n);
  };
  const goToday = () => setDia(new Date());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="title">Agenda</h1>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={goPrev}>◀ Dia anterior</button>
          <button className="btn btn-secondary" onClick={goToday}>Hoje</button>
          <button className="btn btn-secondary" onClick={goNext}>Próximo dia ▶</button>
        </div>
      </div>

      <div className="card">
        <div className="mb-2 font-semibold">Agenda do dia {fmtDia}</div>

        {loading ? (
          <div className="small text-textsec">Carregando...</div>
        ) : erro ? (
          <div className="small text-red-600">Erro: {erro}</div>
        ) : sessoes.length === 0 ? (
          <div className="small">Nenhuma consulta para este dia.</div>
        ) : (
          <div className="space-y-2">
            {sessoes.map((s) => {
              const t = new Date(s.data);
              const hora = t.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
              const nomePac = s.paciente_id ? (pacientes[s.paciente_id] || `Paciente ${s.paciente_id.slice(0, 6)}…`) : "—";
              const status = s.status || "agendado";
              return (
                <div key={s.id} className="flex items-center justify-between border rounded-xl px-3 py-2 bg-white shadow-soft">
                  <div className="flex items-center gap-3">
                    <div className="font-semibold min-w-[56px]">{hora}</div>
                    <div className="text-textsec">
                      <div className="font-medium text-textmain">{nomePac}</div>
                      <div className="text-xs">Status: {status}{s.tipo ? ` · ${s.tipo}` : ""}</div>
                    </div>
                  </div>
                  {/* aqui depois dá pra colocar botões de reagendar/cancelar */}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
