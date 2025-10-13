
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { formatBRDate } from "@/lib/utils";

export default function SessoesPacientePage() {
  const { pacienteId } = useParams<{ pacienteId: string }>();
  const [lista, setLista] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ data: new Date().toISOString().slice(0,16), tipo: "Sessão", observacoes: "", dor: 0, evolucao: "", status: "concluido" });

  const load = async () => {
    const { data } = await supabase.from("sessoes").select("*").eq("paciente_id", pacienteId).order("data", { ascending: true });
    setLista(data || []);
  };
  useEffect(()=>{ load(); }, [pacienteId]);

  const add = async () => {
    await supabase.from("sessoes").insert({
      paciente_id: pacienteId,
      data: new Date(form.data).toISOString(),
      tipo: form.tipo,
      observacoes: form.observacoes || null,
      dor: Number(form.dor) || 0,
      evolucao: form.evolucao || null,
      status: form.status
    });
    setForm({ ...form, observacoes: "", evolucao: "" });
    load();
  };

  const chartData = lista.map(s => ({ date: formatBRDate(s.data), dor: s.dor || 0 }));

  return (
    <div>
      <h1 className="title">Sessões</h1>

      <div className="card mb-3 grid md:grid-cols-3 gap-3">
        <div>
          <div className="label">Data/hora</div>
          <input className="input" type="datetime-local" value={form.data} onChange={(e)=>setForm({...form, data: e.target.value})} />
        </div>
        <div>
          <div className="label">Tipo</div>
          <input className="input" value={form.tipo} onChange={(e)=>setForm({...form, tipo: e.target.value})} />
        </div>
        <div>
          <div className="label">Nível de dor (0-10)</div>
          <input className="input" type="number" min={0} max={10} value={form.dor} onChange={(e)=>setForm({...form, dor: e.target.value})} />
        </div>
        <div className="md:col-span-3">
          <div className="label">Evolução / Anotações</div>
          <textarea className="input" rows={2} value={form.evolucao} onChange={(e)=>setForm({...form, evolucao: e.target.value})} />
        </div>
        <div className="md:col-span-3">
          <button className="btn btn-primary" onClick={add}>Registrar sessão</button>
        </div>
      </div>

      <div className="card mb-3">
        <div className="font-semibold mb-2">Evolução da dor</div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Line type="monotone" dataKey="dor" dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-2">
        {lista.map(s => (
          <div key={s.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{formatBRDate(s.data)} · {s.tipo}</div>
                <div className="small">Dor {s.dor} · {s.evolucao || "Sem notas"}</div>
              </div>
              <div className="badge">{s.status}</div>
            </div>
          </div>
        ))}
        {lista.length === 0 && <div className="small">Nenhum registro.</div>}
      </div>
    </div>
  );
}
