"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PatientTabs from "@/components/PatientTabs";

/* utils simples */
function initials(fullName: string) {
  const parts = (fullName || "").trim().split(/\s+/);
  if (!parts.length) return "P";
  const one = parts[0]?.[0] ?? "";
  const two = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (one + two).toUpperCase();
}
const isMissingColumn = (e: unknown) =>
  typeof (e as any)?.message === "string" &&
  /column .* does not exist/i.test((e as any).message);

/* tipos */
type Anamnese = {
  paciente_id: string;
  queixa_principal?: string | null;
  historico_clinico?: string | null;
  historico_familiar?: string | null;
  limitacoes?: string | null;
  uso_medicacoes?: string | null;
  objetivos_tratamento?: string | null;
};

export default function AnamnesePage() {
  // suporta ambas estruturas de rota: /anamnese/[id] e /anamnese/[pacienteId]/[id]
  const params = useParams() as any;
  const pacienteId: string = String(params.id ?? params.pacienteId);

  /* header */
  const [pacNome, setPacNome] = useState<string>("");
  const [pacCodigo, setPacCodigo] = useState<number | null>(null);

  /* form */
  const [form, setForm] = useState<Anamnese>({
    paciente_id: pacienteId,
    queixa_principal: "",
    historico_clinico: "",
    historico_familiar: "",
    limitacoes: "",
    uso_medicacoes: "",
    objetivos_tratamento: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);

      // exige sessão
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) {
        window.location.href = "/login";
        return;
      }

      // HEADER: tenta pegar nome + codigo; se "codigo" não existir no schema, faz fallback
      let { data: pData, error: pErr } = await supabase
        .from("pacientes")
        .select("nome,codigo")
        .eq("id", pacienteId)
        .maybeSingle<any>();

      if (isMissingColumn(pErr)) {
        const res2 = await supabase
          .from("pacientes")
          .select("nome")
          .eq("id", pacienteId)
          .maybeSingle<any>();
        pData = res2.data ?? null;
        pErr = res2.error ?? null;
      }

      if (!pErr && pData) {
        setPacNome(pData.nome || "");
        setPacCodigo(
          Object.prototype.hasOwnProperty.call(pData, "codigo")
            ? (pData as any).codigo ?? null
            : null
        );
      }

      // ANAMNESE: carrega (se existir) por paciente_id
      const { data, error } = await supabase
        .from("anamneses")
        .select("*")
        .eq("paciente_id", pacienteId)
        .maybeSingle<any>();

      if (!error && data) {
        setForm({
          paciente_id: pacienteId,
          queixa_principal: data.queixa_principal ?? "",
          historico_clinico: data.historico_clinico ?? "",
          historico_familiar: data.historico_familiar ?? "",
          limitacoes: data.limitacoes ?? "",
          uso_medicacoes: data.uso_medicacoes ?? "",
          objetivos_tratamento: data.objetivos_tratamento ?? "",
        });
      }

      setLoading(false);
    })();
  }, [pacienteId]);

  async function salvar() {
    setSaving(true);
    setMsg(null);

    const payload = {
      paciente_id: pacienteId,
      queixa_principal: form.queixa_principal || null,
      historico_clinico: form.historico_clinico || null,
      historico_familiar: form.historico_familiar || null,
      limitacoes: form.limitacoes || null,
      uso_medicacoes: form.uso_medicacoes || null,
      objetivos_tratamento: form.objetivos_tratamento || null,
    };

    const { error } = await supabase
      .from("anamneses")
      .upsert(payload, { onConflict: "paciente_id" }); // exige UNIQUE(paciente_id) na tabela

    setSaving(false);
    setMsg(error ? error.message : "Anamnese salva com sucesso!");
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="title">Anamnese</h1>

      {/* header do paciente */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-uppli/10 text-uppli flex items-center justify-center font-semibold">
          {initials(pacNome || "P")}
        </div>
        <div>
          <div className="text-xl font-semibold">{pacNome || "Paciente"}</div>
          {pacCodigo ? (
            <div className="small text-textsec">Nº {pacCodigo}</div>
          ) : (
            <div className="small text-textsec">
              ID: {pacienteId.slice(0, 6)}…{pacienteId.slice(-4)}
            </div>
          )}
        </div>
      </div>

      {/* abas (usa o mesmo componente das outras páginas) */}
      <PatientTabs pacienteId={pacienteId} active="anamnese" />

      <div className="card space-y-4 mt-3">
        {loading ? (
          <div className="small text-textsec">Carregando…</div>
        ) : (
          <>
            {[
              ["Queixa principal", "queixa_principal"],
              ["Histórico clínico", "historico_clinico"],
              ["Histórico familiar", "historico_familiar"],
              ["Limitações", "limitacoes"],
              ["Uso de medicações", "uso_medicacoes"],
              ["Objetivos do tratamento", "objetivos_tratamento"],
            ].map(([label, key]) => (
              <div key={key}>
                <div className="label">{label}</div>
                <textarea
                  className="input"
                  rows={3}
                  value={(form as any)[key] ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </div>
            ))}

            {msg && <div className="small text-textsec">{msg}</div>}

            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={salvar} disabled={saving}>
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
