
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Exercicio = {
  id: string;
  nome: string;
  categoria: string;
  nivel: string;
};

const CATEGORIAS = [
  "Mat",           // Pilates Solo
  "Reformer",
  "Cadillac",
  "Wunda Chair",
  "Barrel",
] as const;

const NIVEIS = ["basico", "intermediario", "avancado"] as const;

export default function ExerciciosPage() {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [lista, setLista] = useState<Exercicio[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: "",
    categoria: "Mat",
    nivel: "basico",
  });

  // pega empresa do usuário logado
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        window.location.href = "/login";
        return;
      }
      const { data, error } = await supabase
        .from("usuarios")
        .select("empresa_id")
        .eq("id", auth.user.id)
        .maybeSingle();

      if (error) {
        setMsg(error.message);
        return;
      }
      setEmpresaId(data?.empresa_id ?? null);
    })();
  }, []);

  // carrega exercícios da empresa
  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      const { data, error } = await supabase
        .from("exercicios")
        .select("id,nome,categoria,nivel")
        .eq("empresa_id", empresaId)
        .order("categoria", { ascending: true })
        .order("nome", { ascending: true });

      if (error) {
        setMsg(error.message);
      } else {
        setLista((data || []) as Exercicio[]);
      }
    })();
  }, [empresaId]);

  const add = async () => {
    setMsg(null);
    if (!empresaId) return;
    if (!form.nome.trim()) {
      setMsg("Informe o nome do exercício.");
      return;
    }

    const payload = {
      empresa_id: empresaId,
      nome: form.nome.trim(),
      categoria: form.categoria,
      nivel: form.nivel,
    };

    const { error } = await supabase.from("exercicios").insert(payload);
    if (error) {
      setMsg(error.message);
      return;
    }

    // limpa e recarrega
    setForm({ ...form, nome: "" });
    const { data } = await supabase
      .from("exercicios")
      .select("id,nome,categoria,nivel")
      .eq("empresa_id", empresaId)
      .order("categoria")
      .order("nome");
    setLista((data || []) as Exercicio[]);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="title">Exercícios</h1>

      {msg && <div className="small text-red-600 mb-2">{msg}</div>}

      <div className="card mb-3 grid md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <div className="label">Nome</div>
          <input
            className="input"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex.: Hundred"
          />
        </div>

        <div>
          <div className="label">Categoria</div>
          <select
            className="input"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="label">Nível</div>
          <select
            className="input"
            value={form.nivel}
            onChange={(e) => setForm({ ...form, nivel: e.target.value })}
          >
            {NIVEIS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4">
          <button className="btn btn-primary" onClick={add} disabled={!empresaId}>
            Adicionar
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {lista.map((x) => (
          <div key={x.id} className="card">
            <div className="font-semibold">{x.nome}</div>
            <div className="small text-textsec">
              {x.categoria} • {x.nivel}
            </div>
          </div>
        ))}
        {empresaId && lista.length === 0 && (
          <div className="small">Sem exercícios cadastrados para esta empresa.</div>
        )}
      </div>
    </div>
  );
}

