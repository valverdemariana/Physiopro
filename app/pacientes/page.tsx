"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";

/** Tipos */
type Paciente = {
  id: string;
  nome: string;
  cpf: string;
  diagnostico?: string | null;
  ativo: boolean;
  data_nascimento?: string | null; // se a coluna não existir, caímos no fallback
};

/** Utils */
function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (!parts.length) return "P";
  const one = parts[0]?.[0] || "";
  const two = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (one + two).toUpperCase();
}

function calcAge(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return `${age}`;
}

/** Página */
export default function PacientesPage() {
  const sp = useSearchParams();
  const onlyActive = sp.get("onlyActive") === "1";

  const [search, setSearch] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    diagnostico: "",
    data_nascimento: "", // <-- novo
  });
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const ensureSession = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      window.location.href = "/login";
      return null;
    }
    return data.session;
  };

  /** Carrega pacientes — tenta pegar data_nascimento; se a coluna não existir, cai no fallback */
  const load = async () => {
    setErro(null);
    setCarregando(true);

    const sess = await ensureSession();
    if (!sess) return;

    // query base
    const base = supabase
      .from("pacientes")
      .select("id,nome,cpf,diagnostico,ativo,data_nascimento")
      .ilike("nome", `%${search}%`)
      .order("nome", { ascending: true });

    let query = base;
    if (onlyActive) query = query.eq("ativo", true);

    let data: Paciente[] | null = null;
    let error = null;

    // tenta com data_nascimento
    const res = await query;
    if (res.error?.message?.toLowerCase().includes("column") && res.error.message.includes("data_nascimento")) {
      // coluna não existe -> fallback sem ela
      const q2 = supabase
        .from("pacientes")
        .select("id,nome,cpf,diagnostico,ativo")
        .ilike("nome", `%${search}%`)
        .order("nome", { ascending: true });

      const res2 = onlyActive ? await q2.eq("ativo", true) : await q2;
      data = (res2.data || []) as Paciente[];
      error = res2.error;
    } else {
      data = (res.data || []) as Paciente[];
      error = res.error;
    }

    if (error) {
      console.error(error);
      setErro(error.message);
      setPacientes([]);
    } else {
      setPacientes(data || []);
    }

    setCarregando(false);
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

    const sess = await ensureSession();
    if (!sess) return;

    const { error } = await supabase.from("pacientes").insert({
      nome: form.nome,
      cpf: form.cpf,
      diagnostico: form.diagnostico || null,
      data_nascimento: form.data_nascimento || null, // <-- novo
      ativo: true,
    });

    if (error) {
      setErro(error.message);
      return;
    }
    setShowForm(false);
    setForm({ nome: "", cpf: "", diagnostico: "", data_nascimento: "" }); // <-- reset atualizado
    load();
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    setErro(null);
    const sess = await ensureSession();
    if (!sess) return;

    const { error } = await supabase.from("pacientes").update({ ativo: !ativo }).eq("id", id);
    if (error) {
      setErro(error.message);
      return;
    }
    load();
  };

  return (
    <div className="max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="title m-0">Pacientes</h1>

        <button
          className="btn btn-primary md:hidden"
          aria-label="Novo paciente"
          onClick={() => setShowForm(true)}
          title="Novo paciente"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Busca + botão Novo paciente */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-uppli" />
          <input
            className="input pl-9"
            placeholder="Buscar pacientes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button className="btn btn-primary hidden md:inline-flex" onClick={() => setShowForm(true)}>
          Novo paciente
        </button>
      </div>

      {/* Grupo: Ativos */}
      <div className="text-textmain font-semibold mb-2">Ativos</div>

      {/* Lista responsiva em cards */}
      <div className="space-y-2">
        {carregando ? (
          <div className="small text-textsec">Carregando...</div>
        ) : pacientes.length === 0 ? (
          <div className="small text-textsec">Nenhum paciente encontrado.</div>
        ) : (
          pacientes.map((p) => {
            const age = calcAge(p.data_nascimento);
            return (
              <div
                key={p.id}
                className="bg-white shadow-soft rounded-2xl px-4 py-3 flex items-center justify-between"
              >
                {/* Esquerda: avatar + infos */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-uppli/10 text-uppli flex items-center justify-center font-semibold shrink-0">
                    {initials(p.nome)}
                  </div>

                  <div className="min-w-0">
                    <div className="font-semibold text-textmain truncate">{p.nome}</div>
                    <div className="text-xs text-textsec truncate" title={p.id}>
                      ID: {p.id} • {age} {age !== "—" ? "anos" : ""} {p.diagnostico ? `• ${p.diagnostico}` : ""}
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    className="badge"
                    onClick={() => toggleAtivo(p.id, p.ativo)}
                    title={p.ativo ? "Desativar" : "Ativar"}
                  >
                    {p.ativo ? "Ativo" : "Inativo"}
                  </button>
                  <Link href={`/pacientes/${p.id}`} className="btn btn-secondary">
                    Abrir
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: novo paciente */}
      {showForm && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="card w-full max-w-xl">
            <div className="mb-2 font-semibold">Novo paciente</div>

            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-3">
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
                <div className="label">Data de nascimento</div>
                <input
                  type="date"
                  className="input"
                  value={form.data_nascimento}
                  onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                />
              </div>

              <div className="md:col-span-1 md:col-start-3">
                <div className="label">Diagnóstico</div>
                <input
                  className="input"
                  value={form.diagnostico}
                  onChange={(e) => setForm({ ...form, diagnostico: e.target.value })}
                />
              </div>
            </div>

            {erro && <div className="small text-red-600 mt-2">{erro}</div>}

            <div className="flex gap-2 mt-3">
              <button className="btn btn-primary" onClick={addPaciente}>
                Salvar
              </button>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
