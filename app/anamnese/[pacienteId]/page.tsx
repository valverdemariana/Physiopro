
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AnamnesePage() {
  const { pacienteId } = useParams<{ pacienteId: string }>();
  const [form, setForm] = useState<any>({
    queixa_principal: "", historico_clinico: "", limitacoes: "", medicacoes: "", objetivos: "", dor: 0
  });
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("anamneses").select("*").eq("paciente_id", pacienteId).maybeSingle();
      if (data) {
        setForm(data);
        setLoadedId(data.id);
      }
    };
    load();
  }, [pacienteId]);

  const save = async () => {
    setMsg(null);
    if (loadedId) {
      const { error } = await supabase.from("anamneses").update(form).eq("id", loadedId);
      if (error) return setMsg(error.message);
    } else {
      const { error } = await supabase.from("anamneses").insert({ ...form, paciente_id: pacienteId });
      if (error) return setMsg(error.message);
    }
    setMsg("Salvo com sucesso.");
  };

  return (
    <div>
      <h1 className="title">Anamnese</h1>
      <div className="space-y-2">
        {msg && <div className={msg.includes("sucesso") ? "text-green-600 small" : "text-red-600 small"}>{msg}</div>}
        <div>
          <div className="label">Queixa principal</div>
          <textarea className="input" rows={3} value={form.queixa_principal||""} onChange={(e)=>setForm({...form, queixa_principal: e.target.value})} />
        </div>
        <div>
          <div className="label">Histórico clínico</div>
          <textarea className="input" rows={3} value={form.historico_clinico||""} onChange={(e)=>setForm({...form, historico_clinico: e.target.value})} />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <div className="label">Limitações</div>
            <textarea className="input" rows={2} value={form.limitacoes||""} onChange={(e)=>setForm({...form, limitacoes: e.target.value})} />
          </div>
          <div>
            <div className="label">Uso de medicações</div>
            <textarea className="input" rows={2} value={form.medicacoes||""} onChange={(e)=>setForm({...form, medicacoes: e.target.value})} />
          </div>
        </div>
        <div>
          <div className="label">Objetivos do tratamento</div>
          <textarea className="input" rows={2} value={form.objetivos||""} onChange={(e)=>setForm({...form, objetivos: e.target.value})} />
        </div>
        <div>
          <div className="label">Escala de dor (0 a 10)</div>
          <input type="number" min={0} max={10} className="input" value={form.dor||0} onChange={(e)=>setForm({...form, dor: Number(e.target.value)})} />
        </div>
        <button className="btn btn-primary" onClick={save}>Salvar</button>
      </div>
    </div>
  );
}
