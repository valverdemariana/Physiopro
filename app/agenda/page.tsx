"use client";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatBRDate } from "@/lib/utils";
import DayAgenda from "@/components/DayAgenda";

export default function AgendaPage() {
  const sp = useSearchParams();
  const view = sp.get("view");
  const dateParam = sp.get("date");

  const selectedDateISO = useMemo(() => {
    if (dateParam) {
      const d = new Date(dateParam);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    if (view === "today") {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    return null;
  }, [view, dateParam]);

  // se grid diário, apenas mostra o DayAgenda
  if (selectedDateISO) {
    return (
      <div className="space-y-3">
        <h1 className="title">Agenda</h1>
        <DayAgenda dateISO={selectedDateISO} />
      </div>
    );
  }

  // visão semanal simples (mantida do MVP) — lista próximo 7 dias
  const [lista, setLista] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    data: new Date().toISOString().slice(0, 16),
    pacienteNome: "",
    tipo: "Consulta",
    status: "agendado",
    dor: 0,
  });

  const load = async () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 7);
    const { data } = await supabase
      .from("sessoes")
      .select("*, pacientes(nome)")
      .gte("data", hoje.toISOString())
      .lt("data", amanha.toISOString())
      .order("data", { ascending: true });
    setLista(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    let pacienteId: string | null = null;
    if (form.pacienteNome) {
      const { data: p } = await supabase
        .from("pacientes")
        .select("id")
        .ilike("nome", form.pacienteNome)
        .maybeSingle();
      if (p?.id) pacienteId = p.id;
      else {
        const { data: novo } = await supabase
          .from("pacientes")
          .insert({ nome: form.pacienteNome, cpf: crypto.randomUUID().slice(0, 11), ativo: true })
          .select()
          .single();
        pacienteId = novo?.id || null;
      }
    }
    await supabase.from("sessoes").insert({
      data: new Date(form.data).toISOString(),
      paciente_id: pacienteId,
      tipo: form.tipo,
      status: form.status,
      dor: Number(form.dor) || 0,
    });
    setForm({ ...form, pacienteNome: "" });
    load();
  };

  return (
    <div>
      <h1 className="title">Agenda</h1>

      <div className="card mb-3 grid md:grid-cols-4 gap-3">
        <div>
          <div className="label">Data/hora</div>
          <input className="input" type="datetime-local" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
        </div>
        <div>
          <div className="label">Paciente</div>
          <input className="input" value={form.pacienteNome} onChange={(e) => setForm({ ...form, pacienteNome: e.target.value })} placeholder="Nome do paciente" />
        </div>
        <div>
          <div className="label">Tipo</div>
          <input className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} />
        </div>
        <div className="flex items-end">
          <button className="btn btn-primary w-full" onClick={add}>Agendar</button>
        </div>
      </div>

      <div className="space-y-2">
        {lista.map((s: any) => (
          <div key={s.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{formatBRDate(s.data)} · {s.tipo}</div>
                <div className="small">{s.pacientes?.nome || "Sem paciente"} · status: {s.status}</div>
              </div>
              <div className="badge">dor {s.dor ?? 0}</div>
            </div>
          </div>
        ))}
        {lista.length === 0 && <div className="small">Sem itens nos próximos dias.</div>}
      </div>
    </div>
  );
}
