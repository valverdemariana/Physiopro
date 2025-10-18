"use client";

import { useEffect, useMemo, useState } from "react";
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
import { formatBRDate } from "@/lib/utils";

/** Constantes UI */
const TIPOS = ["Avaliação", "Reavaliação", "Sessão"] as const;
const TOTAL_PADRAO = 10;
const NUMEROS = Array.from({ length: TOTAL_PADRAO }, (_, i) => i + 1);

/** Tipos */
type Sessao = {
  id: string;
  paciente_id: string;
  data: string;
  tipo?: string | null;
  observacoes?: string | null;
  dor?: number | null;
  evolucao?: string | null;
  status?: string | null;
};

type Exercicio = {
  id: string;
  categoria: string;
  nome: string;
  nivel: string | null;
  aparelho: string | null;
};

type SessaoExercicioRow = {
  id: string;
  ordem: number | null;
  exercicios: {
    nome: string;
    categoria: string;
    nivel: string | null;
    aparelho: string | null;
  } | null;
};

export default function SessoesPacientePage() {
  const { pacienteId } = useParams<{ pacienteId: string }>();

  /** Estado base */
  const [lista, setLista] = useState<Sessao[]>([]);
  const [form, setForm] = useState<{
    data: string;
    tipo: (typeof TIPOS)[number];
    dor: number;
    observacoes: string;
    evolucao: string;
    status: string;
    numero?: number | null; // nº da sessão (1–10) – salvo como prefixo em observações
  }>({
    data: new Date().toISOString().slice(0, 16),
    tipo: "Sessão",
    dor: 0,
    observacoes: "",
    evolucao: "",
    status: "concluido",
    numero: null,
  });

  /** Exercícios */
  const [exLib, setExLib] = useState<Exercicio[]>([]);
  const [showExModal, setShowExModal] = useState(false);
  const [selectedExIds, setSelectedExIds] = useState<string[]>([]);

  /** Expandir sessão e exibir exercícios vinculados */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sessaoExs, setSessaoExs] = useState<Record<string, SessaoExercicioRow[]>>(
    {}
  );

  /** Carrega sessões do paciente */
  const load = async () => {
    const { data } = await supabase
      .from("sessoes")
      .select("*")
      .eq("paciente_id", pacienteId)
      .order("data", { ascending: true });

    setLista((data || []) as Sessao[]);
  };

  /** Carrega biblioteca de exercícios */
  const loadExLib = async () => {
    const { data } = await supabase
      .from("exercicios")
      .select("id,categoria,nome,nivel,aparelho")
      .order("categoria", { ascending: true })
      .order("nome", { ascending: true });

    setExLib((data || []) as Exercicio[]);
  };

  useEffect(() => {
    load();
    loadExLib();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  /** Dados do gráfico */
  const chartData = useMemo(
    () =>
      lista.map((s) => ({
        date: formatBRDate(s.data),
        dor: s.dor ?? 0,
      })),
    [lista]
  );

  /** Toggle seleção de exercício na modal */
  const toggleEx = (id: string) => {
    setSelectedExIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  /** Salvar sessão + anexar exercícios */
  const add = async () => {
    // Prefixo com número de sessão (não quebra schema)
    const prefix =
      form.numero && form.numero >= 1 && form.numero <= TOTAL_PADRAO
        ? `[${form.numero}/${TOTAL_PADRAO}] `
        : "";

    const { data: created, error } = await supabase
      .from("sessoes")
      .insert({
        paciente_id: pacienteId,
        data: new Date(form.data).toISOString(),
        tipo: form.tipo,
        observacoes: `${prefix}${form.observacoes || ""}`.trim(),
        dor: Number(form.dor) || 0,
        evolucao: form.evolucao || null,
        status: form.status,
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);
      return;
    }

    if (created && selectedExIds.length) {
      const rows = selectedExIds.map((exId, i) => ({
        sessao_id: created.id,
        exercicio_id: exId,
        ordem: i + 1,
      }));
      await supabase.from("sessoes_exercicios").insert(rows);
    }

    setSelectedExIds([]);
    setShowExModal(false);
    setForm({
      data: new Date().toISOString().slice(0, 16),
      tipo: "Sessão",
      dor: 0,
      observacoes: "",
      evolucao: "",
      status: "concluido",
      numero: null,
    });
    load();
  };

  /** Expande/colapsa e busca exercícios vinculados à sessão */
  const toggleExpand = async (sessaoId: string) => {
    if (expandedId === sessaoId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(sessaoId);

    const { data } = await supabase
      .from("sessoes_exercicios")
      .select(
        "id,ordem,exercicios:exercicio_id(nome,categoria,nivel,aparelho)"
      )
      .eq("sessao_id", sessaoId)
      .order("ordem");

    setSessaoExs((prev) => ({ ...prev, [sessaoId]: (data || []) as any }));
  };

  /** Agrupamento de exercícios por categoria (para a modal) */
  const agrupado = useMemo(() => {
    return exLib.reduce<Record<string, Exercicio[]>>((acc, ex) => {
      (acc[ex.categoria] ||= []).push(ex);
      return acc;
    }, {});
  }, [exLib]);

  return (
    <div>
      <h1 className="title">Sessões</h1>

      {/* Seletor de tipo + nº sessão + dor */}
      <div className="card mb-3 space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
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
            <div className="flex gap-2 flex-wrap">
              {TIPOS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, tipo: t })}
                  className={`badge ${
                    form.tipo === t ? "bg-uppli text-white" : ""
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="label">Nível de dor (0–10)</div>
            <input
              className="input"
              type="number"
              min={0}
              max={10}
              value={form.dor}
              onChange={(e) =>
                setForm({ ...form, dor: Number(e.target.value || 0) })
              }
            />
          </div>
        </div>

        {/* Número da sessão (1–10) + botão de exercícios */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <div className="label mb-1">Nº da sessão (1–10)</div>
            <div className="flex gap-2 flex-wrap">
              {NUMEROS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, numero: n })}
                  className={`badge ${
                    form.numero === n ? "bg-uppli text-white" : ""
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setForm({ ...form, numero: null })}
                className={`badge ${form.numero == null ? "bg-uppli text-white" : ""}`}
                title="Sem número"
              >
                sem nº
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn btn-secondary"
              onClick={() => setShowExModal(true)}
            >
              Adicionar exercícios
            </button>
            {selectedExIds.length > 0 && (
              <span className="badge">
                {selectedExIds.length} selecionado(s)
              </span>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="md:col-span-3">
            <div className="label">Evolução / Anotações</div>
            <textarea
              className="input"
              rows={2}
              value={form.evolucao}
              onChange={(e) => setForm({ ...form, evolucao: e.target.value })}
            />
          </div>
        </div>

        <div className="md:col-span-3">
          <button className="btn btn-primary" onClick={add}>
            Registrar sessão
          </button>
        </div>
      </div>

      {/* Gráfico */}
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

      {/* Lista de sessões com histórico clicável */}
      <div className="space-y-2">
        {lista.map((s) => (
          <div key={s.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">
                  {formatBRDate(s.data)} · {s.tipo}
                </div>
                <div className="small">
                  Dor {s.dor ?? 0} · {s.evolucao || "Sem notas"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="badge" onClick={() => toggleExpand(s.id)}>
                  {expandedId === s.id ? "Ocultar exercícios" : "Exercícios"}
                </button>
                <div className="badge">{s.status}</div>
              </div>
            </div>

            {expandedId === s.id && (
              <div className="mt-2 border-t pt-2">
                {(sessaoExs[s.id] || []).length === 0 ? (
                  <div className="small text-textsec">
                    Nenhum exercício vinculado.
                  </div>
                ) : (
                  <ul className="small list-disc pl-5">
                    {sessaoExs[s.id].map((it) => (
                      <li key={it.id}>
                        <span className="text-textsec mr-1">#{it.ordem}</span>
                        {it.exercicios?.nome}{" "}
                        <span className="text-textsec">
                          — {it.exercicios?.categoria}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
        {lista.length === 0 && (
          <div className="small text-textsec">Nenhum registro.</div>
        )}
      </div>

      {/* Modal de exercícios */}
      {showExModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="card w-full max-w-3xl max-h-[80vh] overflow-auto">
            <div className="mb-2 font-semibold">Adicionar exercícios</div>

            {Object.entries(agrupado).map(([cat, itens]) => (
              <div key={cat} className="mb-3">
                <div className="text-sm font-semibold text-textsec mb-1">
                  {cat}
                </div>
                <div className="grid md:grid-cols-2 gap-2">
                  {itens.map((ex) => {
                    const checked = selectedExIds.includes(ex.id);
                    return (
                      <label
                        key={ex.id}
                        className={`card cursor-pointer ${
                          checked ? "ring-1 ring-uppli" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="accent-uppli"
                            checked={checked}
                            onChange={() => toggleEx(ex.id)}
                          />
                          <div>
                            <div className="font-medium">{ex.nome}</div>
                            <div className="small text-textsec">
                              {ex.nivel || "básico"}{" "}
                              {ex.aparelho ? `· ${ex.aparelho}` : ""}
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex gap-2 mt-3">
              <button
                className="btn btn-primary"
                onClick={() => setShowExModal(false)}
              >
                Concluir seleção
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedExIds([]);
                  setShowExModal(false);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
