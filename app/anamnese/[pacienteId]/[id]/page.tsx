"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PatientHeader from "@/components/PatientHeader";
import PatientTabs from "@/components/PatientTabs";

/** Tipos */
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
  // Suporta /anamnese/[id] ou /anamnese/[pacienteId]
  const params = useParams() as any;
  const pacienteId: string = String(params.id ?? params.pacienteId);

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

      // carrega anamnese (se existir) por paciente_id
      const { data, error } = await supabase
        .from("anamneses")
        .select("*")
        .eq("paciente_id", pacienteId)
        .maybeSingle<Anamnese>();

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

    const payload: Anamnese = {
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
      .upsert(payload, { onConflict: "paciente_id" }); // requer UNIQUE(paciente_id)

    setSaving(false);
    setMsg(error ? error.message : "Anamnese salva com sucesso!");
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="title">Anamnese</h1>

      {/* Cabeçalho + Abas iguais às outras páginas */}
      <PatientHeader pacienteId={pacienteId} />
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
