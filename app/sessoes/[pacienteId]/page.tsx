"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

/** util simples para formatar data PT-BR (data + hora) */
function formatBRDate(value: string | Date) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "--/--/----";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Tipos clicáveis */
const TIPOS = ["Avaliação", "Reavaliação", "Sessão"] as const;
/** Faixa de sessões planejadas */
const TOTAL_PADRAO = 10;
const NUMEROS = Array.from({ length: TOTAL_PADRAO }, (_, i) => i + 1);

/** tenta extrair n/total a partir de observações/evolução (ex.: "[3/10] ...") */
function getNTotalFromText(text?: string | null): { n: number | null; total: number | null } {
  const str = String(text || "");
  const m = str.match(/\[(\d+)\s*\/\s*(\d+)\]/); // [n/total]
  if (!m) return { n: null, total: null };
  return { n: Number(m[1]), total: Number(m[2]) };
}

export default function SessoesPacientePage() {
  const { pacienteId } = useParams<{ pacienteId: string }>();

  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  /** formulário */
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 16), // datetime-local
    tipo: "Sessão",
    numero: 1,
    totalPlanejado: TOTAL_PADRAO,
    dor: 0,
    evolucao: "",
    status: "concluido",
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sessoes")
      .select("*")
      .eq("paciente_id", pacienteId)
      .order("data", { ascending: true });

    if (error) {
      console.error(error);
      setMsg(error.message);
      setLista([]);
    } else {
      setLista(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  /** série para o gráfico da dor */
  const chartData = useMemo(
    () =>
      (lista || []).map((s: any) => ({
        date: formatBRDate(s.data),
        dor: Number(s.dor || 0),
      })),
    [lista]
  );

  /** progresso (conta sessões com status concluído) */
  const concluidas = useMemo(
    () => (lista || []).filter((s: any) => (s.status || "").toLowerCase() === "concluido").length,
    [lista]
  );

  const add = async () => {
    setMsg(null);

    // persistimos n/total dentro do texto para não depender de colunas novas
    const prefixo = `[${form.numero}/${form.totalPlanejado}]`;
    const texto = `${prefixo} ${form.evolucao || ""}`.trim();

    const payload: any = {
      paciente_id: pacienteId,
      data: new Date(form.data).toISOString(),
      tipo: form.tipo,
      dor: Number(form.dor) || 0,
      evolucao: texto,
      observacoes: texto,
      status: form.status,
    };

    const { error } = await supabase.from("sessoes").insert(payload);
    if (error) {
      setMsg(error.message);
      return;
    }
    setForm((old) => ({
      ...old,
      evolucao: "",
      // se já chegou no total, mantém no máximo
      numero: Math.min(old.numero + 1, old.totalPlanejado),
    }));
    load();
  };

  return (
    <div>
      {/* Header com voltar */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="title m-0">Sessões</h1>
        <button className="btn btn-secondary" onClick={() => history.back()}>
          Voltar
        </button>
      </div>

      {/* Formulário  */}
      <div className="card mb-3">
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <div className="label">Data/hora</div>
            <input
              className="input"
              type="datetime-local"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
            />
          </div>

          <div>
            <div className="label">Tipo</div>
            {/* botões clicáveis, mas também serve para mobile (select) */}
            <div className="flex gap-2 mb-2">
              {TIPOS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`badge ${form.tipo === t ? "bg-uppli text-white" : ""}`}
                  onClick={() => setForm({ ...form, tipo: t })}
                >
                  {t}
                </button>
              ))}
            </div>
            <select
              className="input"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="label">Sessão nº</div>
            <select
              className="input"
              value={form.numero}
              onChange={(e) => setForm({ ...form, numero: Number(e.target.value) })}
            >
              {NUMEROS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="label">Total planejado</div>
            <select
              className="input"
              value={form.totalPlanejado}
              onChange={(e) => setForm({ ...form, totalPlanejado: Number(e.target.value) })}
            >
              {NUMEROS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="label">Nível de dor (0–10)</div>
            <input
              className="input"
              type="number"
              min={0}
              max={10}
              value={form.dor}
              onChange={(e) => setForm({ ...form, dor: Number(e.target.value) })}
            />
          </div>

          <div className="md:col-span-3">
            <div className="label">Evolução / Anotações</div>
            <textarea
              className="input"
              rows={2}
              placeholder="Ex.: Mobilização de ombro; ganho de ADM; exercícios domiciliares..."
              value={form.evolucao}
              onChange={(e) => setForm({ ...form, evolucao: e.target.value })}
            />
            <div className="small text-textsec mt-1">
              O texto será salvo como <code>[{form.numero}/{form.totalPlanejado}]</code> no início para
              registrar o progresso.
            </div>
          </div>

          <div className="md:col-span-4">
            <button className="btn btn-primary" onClick={add}>
              Registrar sessão
            </button>
          </div>
        </div>

        <div className="mt-3 text-sm text-textsec">
          Concluídas: <span className="font-semibold">{concluidas}</span>
        </div>
        {msg && (
          <div className={`mt-2 small ${msg.toLowerCase().includes("erro") ? "text-red-600" : "text-green-600"}`}>
            {msg}
          </div>
        )}
      </div>

      {/* Gráfico da dor */}
      <div className="card mb-3">
        <div className="font-semibold mb-2">Evolução da dor</div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Line type="monotone" dataKey="dor" dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lista com histórico expansível */}
      <div className="space-y-2">
        {loading && <div className="small text-textsec">Carregando...</div>}

        {!loading &&
          lista.map((s: any) => {
            const { n, total } = getNTotalFromText(s.observacoes || s.evolucao);
            return (
              <details key={s.id} className="card">
                <summary className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="font-semibold">
                      {formatBRDate(s.data)} · {s.tipo}{" "}
                      {n && total ? (
                        <span className="text-textsec font-normal">— sessão {n}/{total}</span>
                      ) : null}
                    </div>
                    <div className="small">Dor {s.dor ?? 0}</div>
                  </div>
                  <div className="badge">{s.status}</div>
                </summary>

                <div className="mt-2 text-sm whitespace-pre-wrap">
                  {s.evolucao || s.observacoes || "Sem notas."}
                </div>
              </details>
            );
          })}

        {!loading && lista.length === 0 && <div className="small">Nenhum registro.</div>}
      </div>
    </div>
  );
}
