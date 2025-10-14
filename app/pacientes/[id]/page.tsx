"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

/** Utils simples */
function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (!parts.length) return "P";
  const one = parts[0]?.[0] || "";
  const two = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (one + two).toUpperCase();
}

/** Tipos — alguns campos podem não existir no seu schema, por isso são opcionais */
type Paciente = {
  id: string;
  codigo?: number | null;
  nome: string;
  data_nascimento?: string | null;
  diagnostico?: string | null;

  // opcionais (tela “Informações”)
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  medico_responsavel?: string | null;
};

export default function PacienteDadosPage() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState<Required<Pick<Paciente,
    "nome" | "diagnostico">> & Partial<Paciente>>({
    nome: "",
    diagnostico: "",
    data_nascimento: "",
    email: "",
    telefone: "",
    endereco: "",
    medico_responsavel: "",
  });

  const tabAtiva = useMemo(() => "dados", []);

  async function ensureSession() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      window.location.href = "/login";
      return null;
    }
    return data.session;
  }

  /** Carrega paciente — tenta buscar todos os campos; se alguma coluna não existir, faz fallback */
  async function load() {
    setCarregando(true);
    setErro(null);

    const sess = await ensureSession();
    if (!sess) return;

    // tentativa completa
    let { data, error } = await supabase
      .from("pacientes")
      .select(
        "id,codigo,nome,data_nascimento,diagnostico,email,telefone,endereco,medico_responsavel"
      )
      .eq("id", id)
      .maybeSingle<Paciente>();

    // fallback (schema ainda sem as colunas novas)
    if (error && error.message.toLowerCase().includes("column")) {
      const res2 = await supabase
        .from("pacientes")
        .select("id,nome,data_nascimento,diagnostico")
        .eq("id", id)
        .maybeSingle<Paciente>();
      data = res2.data || null;
      error = res2.error ?? null;
    }

    if (error || !data) {
      setErro(error?.message || "Paciente não encontrado.");
      setCarregando(false);
      return;
    }

    setForm({
      nome: data.nome || "",
      diagnostico: data.diagnostico || "",
      data_nascimento: data.data_nascimento || "",
      email: data.email || "",
      telefone: data.telefone || "",
      endereco: data.endereco || "",
      medico_responsavel: data.medico_responsavel || "",
      codigo: data.codigo ?? null,
      id: data.id,
    } as any);

    setCarregando(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** Salva com fallback (se coluna não existir no banco, tenta novamente com somente colunas seguras) */
  async function salvar() {
    setErro(null);
    setSalvando(true);

    const payload: any = {
      nome: form.nome,
      data_nascimento: form.data_nascimento || null,
      diagnostico: form.diagnostico || null,
      email: form.email || null,
      telefone: form.telefone || null,
      endereco: form.endereco || null,
      medico_responsavel: form.medico_responsavel || null,
    };

    let { error } = await supabase.from("pacientes").update(payload).eq("id", id);

    if (error && error.message.toLowerCase().includes("column")) {
      // corta para o núcleo seguro
      const minimal = {
        nome: payload.nome,
        data_nascimento: payload.data_nascimento,
        diagnostico: payload.diagnostico,
      };
      const res2 = await supabase.from("pacientes").update(minimal).eq("id", id);
      error = res2.error ?? null;
    }

    if (error) {
      setErro(error.message);
    } else {
      await load(); // recarrega para refletir
    }
    setSalvando(false);
  }

  return (
    <div className="max-w-3xl mx-auto w-full">
      {/* Header com nome */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-uppli/10 text-uppli flex items-center justify-center font-semibold">
          {initials(form.nome || "P")}
        </div>
        <div>
          <h1 className="title m-0">{form.nome || "Paciente"}</h1>
          {form.codigo ? (
            <div className="small text-textsec">Nº {form.codigo}</div>
          ) : (
            <div className="small text-textsec">ID: {id?.slice(0, 6)}…{id?.slice(-4)}</div>
          )}
        </div>
      </div>

      {/* Abas */}
      <div className="border-b mb-4 flex gap-6 text-sm">
        <Link
          href={`/pacientes/${id}`}
          className={clsx(
            "pb-3 -mb-px",
            tabAtiva === "dados"
              ? "border-b-2 border-uppli text-textmain font-medium"
              : "text-textsec hover:text-textmain"
          )}
        >
          Informações
        </Link>
        <Link
          href={`/anamnese/${id}`}
          className="pb-3 -mb-px text-textsec hover:text-textmain"
        >
          Anamnese
        </Link>
        <Link
          href={`/sessoes/${id}`}
          className="pb-3 -mb-px text-textsec hover:text-textmain"
        >
          Sessões
        </Link>
      </div>

      {/* Formulário */}
      <div className="card space-y-4">
        {carregando ? (
          <div className="small text-textsec">Carregando…</div>
        ) : (
          <>
            <div>
              <div className="label">Nome</div>
              <input
                className="input"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <div className="label">Data de nascimento</div>
                <input
                  type="date"
                  className="input"
                  value={form.data_nascimento ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, data_nascimento: e.target.value }))
                  }
                />
              </div>
              <div>
                <div className="label">Diagnóstico</div>
                <input
                  className="input"
                  value={form.diagnostico ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, diagnostico: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <div className="label">E-mail</div>
                <input
                  className="input"
                  value={form.email ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <div className="label">Telefone</div>
                <input
                  className="input"
                  value={form.telefone ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, telefone: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <div className="label">Endereço</div>
              <input
                className="input"
                value={form.endereco ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endereco: e.target.value }))
                }
              />
            </div>

            <div>
              <div className="label">Médico responsável</div>
              <input
                className="input"
                value={form.medico_responsavel ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, medico_responsavel: e.target.value }))
                }
              />
            </div>

            {erro && <div className="small text-red-600">{erro}</div>}

            <div className="flex gap-2">
              <button
                className="btn btn-primary"
                onClick={salvar}
                disabled={salvando}
              >
                {salvando ? "Salvando…" : "Salvar"}
              </button>
              <Link href="/pacientes" className="btn btn-secondary">
                Voltar
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
