"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AnamnesePage() {
  const { pacienteId } = useParams<{ pacienteId: string }>();

  const [form, setForm] = useState<any>({
    queixa_principal: "",
    historico_clinico: "",
    historico_familiar: "", // <-- NOVO CAMPO
    limitacoes: "",
    medicacoes: "",
    objetivos: "",
    dor: 0,
  });

  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("anamneses")
        .select("*")
        .eq("paciente_id", pacienteId)
        .maybeSingle();

      if (error) {
        console.error(error);
        return;
      }
      if (data) {
        // Mescla para não perder chaves default (caso a coluna ainda não exista no DB)
        setForm((prev: any) => ({ ...prev, ...data }));
        setLoadedId(data.id);
      }
    };
    load();
  }, [pacienteId]);

  // Monta o payload com as chaves conhecidas
  const buildPayload = () => ({
    queixa_principal: form.queixa_principal ?? null,
    historico_clinico: form.historico_clinico ?? null,
    historico_familiar: form.historico_familiar ?? null, // <-- NOVO CAMPO
    limitacoes: form.limitacoes ?? null,
    medicacoes: form.medicacoes ?? null,
    objetivos: form.objetivos ?? null,
    dor:
      typeof form.dor === "number"
        ? Math.max(0, Math.min(10, form.dor))
        : Number.isNaN(Number(form.dor))
        ? 0
        : Math.max(0, Math.min(10, Number(form.dor))),
  });

  const save = async () => {
    setMsg(null);

    const payload = buildPayload();

    // Função que tenta salvar e, se a coluna historico_familiar não existir ainda,
    // re-tenta sem ela (para não quebrar nada).
    const trySave = async () => {
      if (loadedId) {
        const { error } = await supabase.from("anamneses").update(payload).eq("id", loadedId);
        if (error?.message?.includes("historico_familiar")) {
          const { historico_familiar, ...fallback } = payload as any;
          const { error: err2 } = await supabase.from("anamneses").update(fallback).eq("id", loadedId);
          if (err2) return err2;
          return null;
        }
        return error ?? null;
      } else {
        const toInsert: any = { ...payload, paciente_id: pacienteId };
        const { error } = await supabase.from("anamneses").insert(toInsert);
        if (error?.message?.includes("historico_familiar")) {
          const { historico_familiar, ...fallback } = toInsert;
          const { error: err2 } = await supabase.from("anamneses").insert(fallback);
          if (err2) return err2;
          return null;
        }
        return error ?? null;
      }
    };

    const err = await trySave();
    if (err) return setMsg(err.message);

    setMsg("Salvo com sucesso.");
  };

  return (
    <div>
      <h1 className="title">Anamnese</h1>

      <div className="space-y-2">
        {msg && (
          <div className={msg.includes("sucesso") ? "text-green-600 small" : "text-red-600 small"}>
            {msg}
          </div>
        )}

        <div>
          <div className="label">Queixa principal</div>
          <textarea
            className="input"
            rows={3}
            value={form.queixa_principal || ""}
            onChange={(e) => setForm({ ...form, queixa_principal: e.target.value })}
          />
        </div>

        <div>
          <div className="label">Histórico clínico</div>
          <textarea
            className="input"
            rows={3}
            value={form.historico_clinico || ""}
            onChange={(e) => setForm({ ...form, historico_clinico: e.target.value })}
          />
        </div>

        {/* NOVO BLOCO: Histórico familiar */}
        <div>
          <div className="label">Histórico familiar</div>
          <textarea
            className="input"
            rows={3}
            value={form.historico_familiar || ""}
            onChange={(e) => setForm({ ...form, historico_familiar: e.target.value })}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <div className="label">Limitações</div>
            <textarea
              className="input"
              rows={2}
              value={form.limitacoes || ""}
              onChange={(e) => setForm({ ...form, limitacoes: e.target.value })}
            />
          </div>
          <div>
            <div className="label">Uso de medicações</div>
            <textarea
              className="input"
              rows={2}
              value={form.medicacoes || ""}
              onChange={(e) => setForm({ ...form, medicacoes: e.target.value })}
            />
          </div>
        </div>

        <div>
          <div className="label">Objetivos do tratamento</div>
          <textarea
            className="input"
            rows={2}
            value={form.objetivos || ""}
            onChange={(e) => setForm({ ...form, objetivos: e.target.value })}
          />
        </div>

        <div>
          <div className="label">Escala de dor (0 a 10)</div>
          <input
            type="number"
            min={0}
            max={10}
            className="input"
            value={form.dor ?? 0}
            onChange={(e) =>
              setForm({ ...form, dor: Math.max(0, Math.min(10, Number(e.target.value))) })
            }
          />
        </div>

        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => history.back()}>
            Voltar
          </button>
          <button className="btn btn-primary" onClick={save}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
