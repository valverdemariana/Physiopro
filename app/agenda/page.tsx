"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";

type Sessao = {
  id: string;
  data: string; // ISO
  paciente_id: string | null;
  tipo?: string | null;
  status?: string | null;
};

type Paciente = { id: string; nome: string };

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
      const [y, m, day] = d.split("-").map(Number);
      return new Date(y, (m || 1) - 1, day || 1);
    }
    if (v === "today") return new Date();
    return new Date();
  }, [sp]);

  const [dia, setDia] = useState<Date>(initialDate);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [pacientesMap, setPacientesMap] = useState<PacienteMap>({});
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // estado do modal de novo agendamento
  const [openNew, setOpenNew] = useState(false);
  const [listaPacientes, setListaPacientes] = useState<Paciente[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    paciente_id: "",
    data: "", // yyyy-MM-dd
    hora: "09:00", // HH:mm
    tipo: "",
    observacoes: "",
  });

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

    // sessões do dia
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

    // nomes dos pacientes usados nas sessões
    const ids = Array.from(new Set(list.map(s => s.paciente_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: pacRows, error: pErr } = await supabase
        .from("pacientes")
        .select("id,nome")
        .in("id", ids);

      if (!pErr && pacRows) {
        const map: PacienteMap = {};
        for (const r of pacRows) map[r.id] = r.nome || "Paciente";
        setPacientesMap(map);
      }
    } else {
      setPacientesMap({});
    }

    setLoading(false);
  };

  // abrir modal: pré-carrega pacientes ativos e seta data padrão = dia atual da tela
  const openNewModal = async () => {
    setErro(null);
    const sess = await ensureSession();
    if (!sess) return;

    const { data, error } = await supabase
      .from("pacientes")
      .select("id,nome")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (!error && data) setListaPacientes(data as Paciente[]);
    else console.error(error);

    setForm((f) => ({
      ...f,
      data: format(dia, "yyyy-MM-dd"),
      hora: "09:00",
    }));

    setOpenNew(true);
  };

  const salvarAgendamento = async () => {
    setErro(null);
    if (!form.paciente_id) {
      setErro("Selecione um paciente.");
      return;
    }
    if (!form.data || !form.hora) {
      setErro("Informe data e hora.");
      return;
    }

    const sess = await ensureSession();
    if (!sess) return;

    // monta Date a partir de yyyy-MM-dd + HH:mm
    const [yy, mm, dd] = form.data.split("-").map(Number);
    const [HH, MM] = form.hora.split(":").map(Number);
    const quando = new Date(yy, (mm || 1) - 1, dd || 1, HH || 0, MM || 0, 0, 0);

    setSaving(true);
    const { error } = await supabase.from("sessoes").insert({
      paciente_id: form.paciente_id,
      data: quando.toISOString(),
      tipo: form.tipo || null,
      observacoes: form.observacoes || null,
      status: "agendado",
    });
    setSaving(false);

    if (error) {
      console.error(error);
      setErro(error.message);
      return;
    }

    setOpenNew(false);
    // se agendou para outro dia, move a agenda para aquele dia
    const agDia = new Date(yy, (mm || 1) - 1, dd || 1);
    setDia(agDia);
    await load();
  };

  useEffect(() => {
    setDia(initialDate);
  }, [initialDate]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dia]);

  const fmtDia = format(dia, "dd/MM/yyyy");
  const goPrev = () => { const n = new Date(dia); n.setDate(n.getDate() - 1); setDia(n); };
  const goNext = () => { const n = new Date(dia); n.setDate(n.getDate() + 1); setDia(n); };
  const goToday = () => setDia(new Date());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="title">Agenda</h1>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={openNewModal}>Agendar</button>
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
              const nomePac = s.paciente_id ? (pacientesMap[s.paciente_id] || "Paciente") : "—";
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal simples de novo agendamento */}
      {openNew && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="card w-full max-w-xl">
            <div className="mb-2 font-semibold">Novo agendamento</div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <div className="label">Paciente</div>
                <select
                  className="input"
                  value={form.paciente_id}
                  onChange={(e) => setForm({ ...form, paciente_id: e.target.value })}
                >
                  <option value="">Selecione…</option>
                  {listaPacientes.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="label">Tipo</div>
                <input
                  className="input"
                  placeholder="ex.: Avaliação, Reabilitação…"
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                />
              </div>

              <div>
                <div className="label">Data</div>
                <input
                  type="date"
                  className="input"
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                />
              </div>

              <div>
                <div className="label">Hora</div>
                <input
                  type="time"
                  className="input"
                  value={form.hora}
                  onChange={(e) => setForm({ ...form, hora: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <div className="label">Observações</div>
                <textarea
                  className="input"
                  rows={3}
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                />
              </div>
            </div>

            {erro && <div className="small text-red-600 mt-2">{erro}</div>}

            <div className="flex gap-2 mt-3">
              <button className="btn btn-primary" onClick={salvarAgendamento} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <button className="btn btn-secondary" onClick={() => setOpenNew(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
