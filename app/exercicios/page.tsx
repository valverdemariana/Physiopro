"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Exercicio = {
  id: string;
  nome: string;
  categoria: string;
  nivel: string;
  empresa_id: string | null;
};

// Use os mesmos nomes de categoria do seed global (Solo/Reformer/...)
const CATEGORIAS = ["Solo", "Reformer", "Cadillac", "Wunda Chair", "Barrel"] as const;
const NIVEIS = ["basico", "intermediario", "avancado"] as const;

export default function ExerciciosPage() {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [lista, setLista] = useState<Exercicio[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    categoria: "Solo",     // <- casa com o seed global
    nivel: "basico",
  });

  // 1) Pega empresa do usuário logado
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        window.location.href = "/login";
        return;
      }
      const { data, error } = await supabase
        .from("usuarios")
        .select("empresa_id")
        .eq("id", auth.user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        setMsg(error.message);
        return;
      }
      setEmpresaId(data?.empresa_id ?? null);
    })();
  }, []);

  // 2) Carrega exercícios permitidos pelo RLS:
  //    - catálogo global (empresa_id IS NULL)
  //    - + os da própria empresa (empresa_id = sua empresa)
  //    Como o RLS já filtra, podemos buscar sem where.
  const loadLista = async () => {
    setMsg(null);
    const { data, error } = await supabase
      .from("exercicios")
      .select("id,nome,categoria,nivel,empresa_id")
      .order("categoria", { ascending: true })
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar exercícios:", error);
      setMsg(error.message);
      setLista([]);
      return;
    }
    setLista((data || []) as Exercicio[]);
  };

  useEffect(() => {
    // assim que tiver sessão (independe de empresaId) tenta carregar
    loadLista();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]); // recarrega quando empresaId chegar (útil após login)

  // 3) Adiciona exercício (privado da empresa)
  const add = async () => {
    setMsg(null);
    if (!empresaId) {
      setMsg("Não foi possível identificar a empresa do usuário.");
      return;
    }
    if (!form.nome.trim()) {
      setMsg("Informe o nome do exercício.");
      return;
    }

    const payload = {
      empresa_id: empresaId,              // <- mantém privado
      nome: form.nome.trim(),
      categoria: form.categoria,
      nivel: form.nivel,
    };

    const { error } = await supabase.from("exercicios").insert(payload);
    if (error) {
      console.error(error);
      setMsg(error.message);
      return;
    }

    setForm({ ...form, nome: "" });
    loadLista();
  };

  // (opcional) separar em grupos: Global vs Da Empresa
  const globais = lista.filter((x) => x.empresa_id === null);
  const daEmpresa = lista.filter((x) => x.empresa_id !== null);

  // 4) Seed do catálogo global via API
  const seedCatalogo = async () => {
    try {
      setMsg(null);
      setSeeding(true);
      const r = await fetch("/api/exercicios/seed", { method: "POST" });
      const j = await r.json();
      if (!r.ok) {
        throw new Error(j?.message || "Falha ao popular catálogo.");
      }
      setMsg(j?.message || "Catálogo global populado com sucesso.");
      await loadLista();
    } catch (e: any) {
      setMsg(e?.message || "Erro ao popular catálogo.");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="title">Exercícios</h1>

      {msg && <div className="small mb-2" style={{ color: msg.toLowerCase().includes("erro") ? "#dc2626" : "#1c1c1e" }}>{msg}</div>}

      {/* Formulário de novo exercício (privado) */}
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
            Adicionar (privado da empresa)
          </button>
        </div>
      </div>

      {/* Catálogo global */}
      <div className="text-textmain font-semibold mb-2">Catálogo global</div>
      <div className="space-y-2 mb-4">
        {globais.length === 0 && (
          <div className="card">
            <div className="mb-2">Nenhum exercício global disponível.</div>
            <button
              className="btn btn-primary"
              onClick={seedCatalogo}
              disabled={seeding}
            >
              {seeding ? "Populando..." : "Popular catálogo padrão"}
            </button>
          </div>
        )}

        {globais.map((x) => (
          <div key={x.id} className="card">
            <div className="font-semibold">{x.nome}</div>
            <div className="small text-textsec">
              {x.categoria} • {x.nivel} • Catálogo
            </div>
          </div>
        ))}
      </div>

      {/* Exercícios da empresa */}
      <div className="text-textmain font-semibold mb-2">Da sua empresa</div>
      <div className="space-y-2">
        {daEmpresa.map((x) => (
          <div key={x.id} className="card">
            <div className="font-semibold">{x.nome}</div>
            <div className="small text-textsec">
              {x.categoria} • {x.nivel}
            </div>
          </div>
        ))}
        {empresaId && daEmpresa.length === 0 && (
          <div className="small">Sem exercícios privados cadastrados para esta empresa.</div>
        )}
      </div>
    </div>
  );
}

