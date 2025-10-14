"use client";
export const dynamic = "force-dynamic";
export const revalidate = false;
export const fetchCache = "force-no-store";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Paciente = {
  id: string;
  nome: string;
  cpf: string;
  diagnostico?: string | null;
  ativo: boolean;
};

export default function PacientesPage() {
  const sp = useSearchParams();
  const onlyActive = sp.get("onlyActive") === "1";

  const [search, setSearch] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", cpf: "", diagnostico: "" });
  const [erro, setErro] = useState<string | null>(null);

  const load = async () => {
    let query = supabase
      .from("pacientes")
      .select("id,nome,cpf,diagnostico,ativo")
      .ilike("nome", `%${search}%`)
      .order("nome", { ascending: true });

    if (onlyActive) query = query.eq("ativo", true);

    const { data } = await query;
    setPacientes(data || []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, onlyActive]);

  const addPaciente = async () => {
    setErro(null);
    if (!form.nome || !form.cpf) {
      setErro("Nome e CPF são obrigatórios.");
      return;
    }
    const { error } = await supabase.from("pacientes").insert({
      nome: form.nome,
      cpf: form.cpf,
      diagnostico: form.diagnostico || null,
      ativo: true,
    });
    if (error) {
      setErro(error.message);
      return;
    }
    setShowForm(false);
    setForm({ nome: "", cpf: "", diagnostico: "" });
    load();
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    await supabase.from("pacientes").update({ ativo: !ativo }).eq("id", id);
    load();
  };

  return (
    <div>
      <h1 className="title">Pacientes {onlyActive && "(ativos)"}</h1>

      <div className="flex gap-2 mb-3">
        <input
          className="input"
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          Novo
        </button>
      </div>

      {showForm && (
        <div className="card mb-3 space-y-2">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <div className="label">Nome completo</div>
              <input
                className="input"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div>
              <div className="label">CPF</div>
              <input
                className="input"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              />
            </div>
            <div>
              <div className="label">Diagnóstico</div>
              <input
                className="input"
                value={form.diagnostico}
                onChange={(e) =>
                  setForm({ ...form, diagnostico: e.target.value })
                }
              />
            </div>
          </div>
          {erro && <div className="text-red-600 small">{erro}</div>}
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={addPaciente}>
              Salvar
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {pacientes.map((p) => (
          <div key={p.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{p.nome}</div>
                <div className="small">
                  CPF: {p.cpf} · {p.diagnostico || "Sem diagnóstico"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="badge"
                  onClick={() => toggleAtivo(p.id, p.ativo)}
                >
                  {p.ativo ? "Ativo (desativar)" : "Inativo (ativar)"}
                </button>
                <Link href={`/pacientes/${p.id}`} className="btn btn-secondary">
                  Abrir
                </Link>
              </div>
            </div>
          </div>
        ))}
        {pacientes.length === 0 && (
          <div className="small">Nenhum paciente encontrado.</div>
        )}
      </div>
    </div>
  );
}
