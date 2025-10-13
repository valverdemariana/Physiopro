"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Sessao = {
  id: string;
  data: string;
  tipo: string;
  status?: string | null;
  dor?: number | null;
  pacientes?: { nome?: string | null } | null;
};

function atHour(date: Date, h: number) {
  const d = new Date(date);
  d.setHours(h, 0, 0, 0);
  return d;
}

export default function DayAgenda({ dateISO }: { dateISO: string }) {
  const date = useMemo(() => new Date(dateISO), [dateISO]);
  const start = useMemo(() => atHour(date, 0), [date]);
  const end = useMemo(() => {
    const d = new Date(start);
    d.setDate(d.getDate() + 1);
    return d;
  }, [start]);

  const [items, setItems] = useState<Sessao[]>([]);
  const [loading, setLoading] = useState(true);

  // quick-create modal state
  const [createForHour, setCreateForHour] = useState<number | null>(null);
  const [pacienteNome, setPacienteNome] = useState("");
  const [tipo, setTipo] = useState("Sessão");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const workHours = Array.from({ length: 11 }).map((_, i) => 8 + i); // 08..18

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sessoes")
      .select("id,data,tipo,status,dor,pacientes(nome)")
      .gte("data", start.toISOString())
      .lt("data", end.toISOString())
      .order("data", { ascending: true });
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateISO]);

  const byHour = useMemo(() => {
    const m = new Map<number, Sessao | undefined>();
    for (const s of items) {
      const h = new Date(s.data).getHours();
      m.set(h, s);
    }
    return m;
  }, [items]);

  const openCreate = (h: number) => {
    setPacienteNome("");
    setTipo("Sessão");
    setMsg(null);
    setCreateForHour(h);
  };

  const create = async () => {
    if (createForHour === null) return;
    setSaving(true);
    setMsg(null);

    // resolve paciente
    let pacienteId: string | null = null;
    if (pacienteNome.trim()) {
      const { data: p } = await supabase
        .from("pacientes")
        .select("id")
        .ilike("nome", pacienteNome.trim())
        .maybeSingle();
      if (p?.id) pacienteId = p.id;
      else {
        const { data: novo } = await supabase
          .from("pacientes")
          .insert({
            nome: pacienteNome.trim(),
            cpf: crypto.randomUUID().slice(0, 11),
            ativo: true,
          })
          .select()
          .single();
        pacienteId = novo?.id || null;
      }
    }

    const startSlot = atHour(date, createForHour);
    const { error } = await supabase.from("sessoes").insert({
      data: startSlot.toISOString(),
      paciente_id: pacienteId,
      tipo,
      status: "agendado",
      dor: 0,
    });
    setSaving(false);
    if (error) setMsg(error.message);
    else {
      setCreateForHour(null);
      await load();
    }
  };

  return (
    <div className="card">
      <div className="font-semibold mb-2">
        Agenda de {date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
      </div>

      {loading ? (
        <div className="small text-textsec">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {workHours.map((h) => {
            const s = byHour.get(h);
            const label = `${String(h).padStart(2, "0")}:00`;
            if (s) {
              return (
                <div key={h} className="card flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{label} · {s.tipo}</div>
                    <div className="small">{s.pacientes?.nome || "Sem paciente"} · {s.status || "agendado"}</div>
                  </div>
                  <div className="badge">dor {s.dor ?? 0}</div>
                </div>
              );
            }
            return (
              <button
                key={h}
                onClick={() => openCreate(h)}
                className="card text-left hover:shadow-md transition"
              >
                <div className="font-semibold">{label} · Vago</div>
                <div className="small text-textsec">Clique para agendar</div>
              </button>
            );
          })}
        </div>
      )}

      {/* modalzinho de criação */}
      {createForHour !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4" onClick={() => setCreateForHour(null)}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">
              Novo agendamento — {String(createForHour).padStart(2, "0")}:00
            </div>
            {msg && <div className="small text-red-600 mb-2">{msg}</div>}
            <div className="space-y-2">
              <div>
                <div className="label">Paciente</div>
                <input className="input" value={pacienteNome} onChange={(e) => setPacienteNome(e.target.value)} placeholder="Nome do paciente" />
              </div>
              <div>
                <div className="label">Tipo</div>
                <input className="input" value={tipo} onChange={(e) => setTipo(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <button className="btn btn-secondary" onClick={() => setCreateForHour(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={create} disabled={saving}>
                  {saving ? "Salvando..." : "Agendar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
