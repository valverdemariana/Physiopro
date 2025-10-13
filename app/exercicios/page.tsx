
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ExerciciosPage() {
  const [lista, setLista] = useState<any[]>([]);
  const [form, setForm] = useState({ nome: "", descricao: "" });

  const load = async () => {
    const { data } = await supabase.from("exercicios").select("*").order("nome");
    setLista(data || []);
  };
  useEffect(()=>{ load(); }, []);

  const add = async () => {
    if (!form.nome) return;
    await supabase.from("exercicios").insert({ nome: form.nome, descricao: form.descricao || null });
    setForm({ nome: "", descricao: "" });
    load();
  };

  return (
    <div>
      <h1 className="title">Exercícios</h1>
      <div className="card mb-3 grid md:grid-cols-3 gap-3">
        <div>
          <div className="label">Nome</div>
          <input className="input" value={form.nome} onChange={(e)=>setForm({...form, nome: e.target.value})} />
        </div>
        <div className="md:col-span-2">
          <div className="label">Descrição</div>
          <input className="input" value={form.descricao} onChange={(e)=>setForm({...form, descricao: e.target.value})} />
        </div>
        <div className="md:col-span-3">
          <button className="btn btn-primary" onClick={add}>Adicionar</button>
        </div>
      </div>

      <div className="space-y-2">
        {lista.map(x => (
          <div key={x.id} className="card">
            <div className="font-semibold">{x.nome}</div>
            <div className="small">{x.descricao || "Sem descrição"}</div>
          </div>
        ))}
        {lista.length === 0 && <div className="small">Sem exercícios cadastrados.</div>}
      </div>
    </div>
  );
}
