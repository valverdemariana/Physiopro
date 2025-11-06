"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatBRDate } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

/** Tipos */
type Sessao = {
  id: string;
  paciente_id: string;
  data: string;
  // o BD pode retornar minúsculo; mantemos como string para ser flexível
  tipo: string;
  numero_sessao?: number | null;
  dor?: number | null;
  evolucao?: string | null;
  status?: string | null;
};

type Exercicio = {
  id: string;
  nome: string;
  categoria: string; // "Solo" | "Reformer" | "Cadillac" | "Wunda Chair" | "Barrel"
  nivel: string;     // "basico" | "intermediario" | "avancado"
  empresa_id: string | null;
};

const TIPOS = ["Avaliacao", "Reavaliacao", "Sessao"] as const;
const NROS = Array.from({ length: 10 }, (_, i) => i + 1);

// mapeia o que a UI usa -> valor aceito no BD (ajuste aqui se seu enum tiver acento)
const TIPO_DB: Record<(typeof TIPOS)[number], string> = {
  Avaliacao: "avaliacao",
  Reavaliacao: "reavaliacao",
  Sessao: "sessao",
};

// rótulo amigável independente do valor vir minúsculo/maiúsculo
function labelTipo(t: string) {
  const k = (t || "").toLowerCase();
  if (k === "sessao" || k === "sessão") return "Sessão";
  if (k === "avaliacao" || k === "avaliação") return "Avaliação";
  if (k === "reavaliacao" || k === "reavaliação") return "Reavaliação";
  // fallback: mostra como veio
  return t || "Sessão";
}

export default function SessoesPacientePage() {
  const { pacienteId } = useParams<{ pacienteId: string }>();

  // --- estado principal
  const [lista, setLista] = useState<Sessao[]>([]);
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 16),
    tipo: "Sessao" as (typeof TIPOS)[number],
    numero_sessao: undefined as number | undefined,
    dor: 0,
    evolucao: "",
    status: "concluido",
  });

  // controles de salvamento/erro
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // --- exercícios (catálogo global + da empresa)
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [catalogo, setCatalogo] = useState<Exercicio[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  // expansão de exercícios por sessão listada
  const [aberta, setAberta] = useState<string | null>(null);
  const exMap = useMemo(
    () => new Map(catalogo.map((e) => [e.id, e])),
    [catalogo]
  );
  const [exPorSessao, setExPorSessao] = useState<Record<string, string[]>>({});

  // ---------- helpers ----------
  const toggleSelecionado = (id: string) => {
    setSelecionados((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return catalogo;
    return catalogo.filter(
      (e) =>
        e.nome.toLowerCase().includes(q) ||
        e.categoria.toLowerCase().includes(q) ||
        e.nivel.toLowerCase().includes(q)
    );
  }, [catalogo, busca]);

  // ---------- carregar empresa + catálogo ----------
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        window.location.href = "/login";
        return;
      }
      const { data: u } = await supabase
        .from("usuarios")
        .select("empresa_id")
        .eq("id", auth.user.id)
        .maybeSingle();

      setEmpresaId(u?.empresa_id ?? null);

      // catálogo visível (RLS já filtra: global + da empresa)
      const { data: cat } = await supabase
        .from("exercicios")
        .select("id,nome,categoria,nivel,empresa_id")
        .order("categoria", { ascending: true })
        .order("nome", { ascending: true });

      setCatalogo((cat || []) as Exercicio[]);
    })();
  }, []);

  // ---------- carregar sessões do paciente ----------
  const loadSessoes = async () => {
    const { data, error } = await supabase
      .from("sessoes")
      .select("*")
      .eq("paciente_id", pacienteId)
      .order("data", { ascending: true });

    if (!error) setLista((data || []) as Sessao[]);
  };

  useEffect(() => {
    loadSessoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  // ---------- criar sessão + vincular exercícios ----------
  const add = async () => {
    if (saving) return;
    setErro(null);
    setSaving(true);

    try {
      const insertPayload: any = {
        paciente_id: String(pacienteId),
        data: new Date(form.data).toISOString(),
        // mapeado para o formato aceito no BD
        tipo: TIPO_DB[form.tipo], // "avaliacao" | "reavaliacao" | "sessao"
        numero_sessao: form.numero_sessao ?? null,
        dor: Number.isFinite(form.dor) ? Number(form.dor) : 0,
        evolucao: form.evolucao?.trim() || null,
        // não enviamos "status" para evitar conflito de enum/check
      };

      const { data: inserted, error: e1 } = await supabase
        .from("sessoes")
        .insert(insertPayload)
        .select("id")
        .single();

      if (e1) throw e1;
      const sessaoId = inserted?.id;

      // vincula os exercícios selecionados
      if (sessaoId && selecionados.size > 0) {
        const payload = Array.from(selecionados).map((exId, idx) => ({
          sessao_id: sessaoId,
          exercicio_id: exId,
          ordem: idx + 1,
        }));

        // INSERT simples; se já existir (unique), ignoramos o erro 23505
        const { error: e2 } = await supabase
          .from("sessoes_exercicios")
          .insert(payload);

        const isDuplicate =
          (e2 && (e2 as any).code === "23505") ||
          (e2 && /duplicate key value/i.test((e2 as any).message || ""));

        if (e2 && !isDuplicate) throw e2;
      }

      // limpa e recarrega
      setSelecionados(new Set());
      setForm((f) => ({ ...f, evolucao: "" }));
      setPickerOpen(false);
      await loadSessoes();
    } catch (e: any) {
      setErro(e?.message || "Não foi possível registrar a sessão.");
      console.error("Erro ao registrar sessão:", e);
    } finally {
      setSaving(false);
    }
  };

  // ---------- abrir lista de exercícios de uma sessão (expandir) ----------
  const abrirExerciciosDaSessao = async (sessaoId: string) => {
    if (aberta === sessaoId) {
      setAberta(null);
      return;
    }
    const { data } = await supabase
      .from("sessoes_exercicios")
      .select("exercicio_id")
      .eq("sessao_id", sessaoId);

    setExPorSessao((prev) => ({
      ...prev,
      [sessaoId]: (data || []).map((d) => d.exercicio_id),
    }));
    setAberta(sessaoId);
  };

  // ---------- gráfico (dor por sessão) ----------
  const chartData = useMemo(
    () =>
      lista.map((s) => ({
        date: formatBRDate(s.data),
        dor: s.dor || 0,
      })),
    [lista]
  );

  // ---------- UI ----------
  return (
    <div>
      <h1 className="title">Sessões</h1>

      {/* formulário */}
      <div className="card mb-3 grid md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <div className="label">Data/hora</div>
          <input
            type="datetime-local"
            className="input"
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
                className={`badge ${form.tipo === t ? "bg-uppli text-white" : ""}`}
                onClick={() => setForm({ ...form, tipo: t })}
              >
                {t === "Sessao" ? "Sessão" : t === "Avaliacao" ? "Avaliação" : "Reavaliação"}
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
            onChange={(e) => setForm({ ...form, dor: Number(e.target.value) })}
          />
        </div>

        <div className="md:col-span-4">
          <div className="label">Nº da sessão (1–10)</div>
          <div className="flex gap-2 flex-wrap">
            {NROS.map((n) => (
              <button
                key={n}
                type="button"
                className={`badge ${form.numero_sessao === n ? "bg-uppli text-white" : ""}`}
                onClick={() => setForm({ ...form, numero_sessao: n })}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              className={`badge ${form.numero_sessao == null ? "bg-uppli text-white" : ""}`}
              onClick={() => setForm({ ...form, numero_sessao: undefined })}
              title="Sem número"
            >
              sem nº
            </button>
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="label">Evolução / Anotações</div>
          <textarea
            className="input"
            rows={2}
            value={form.evolucao}
            onChange={(e) => setForm({ ...form, evolucao: e.target.value })}
          />
        </div>

        {/* Botões responsivos */}
        <div className="md:col-span-1">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-end gap-2 h-full">
            <button
              type="button"
              className="btn btn-secondary w-full sm:w-auto"
              onClick={() => setPickerOpen(true)}
            >
              Adicionar exercícios
              {selecionados.size > 0 ? ` (${selecionados.size})` : ""}
            </button>
            <button
              className="btn btn-primary w-full sm:w-auto"
              onClick={add}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Registrar sessão"}
            </button>
          </div>
        </div>

        {erro && <div className="small text-red-600 md:col-span-4">{erro}</div>}
      </div>

      {/* gráfico da dor */}
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

      {/* lista de sessões */}
      <div className="space-y-2">
        {lista.map((s) => (
          <div key={s.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">
                  {formatBRDate(s.data)} · {labelTipo(s.tipo)}
                  {s.numero_sessao ? ` · nº ${s.numero_sessao}` : ""}
                </div>
                <div className="small">
                  Dor {s.dor ?? 0} · {s.evolucao || "Sem notas"}
                </div>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => abrirExerciciosDaSessao(s.id)}
              >
                {aberta === s.id ? "Esconder exercícios" : "Ver exercícios"}
              </button>
            </div>

            {aberta === s.id && (
              <div className="mt-3 space-y-1">
                {(exPorSessao[s.id] || []).map((exId) => {
                  const e = exMap.get(exId);
                  if (!e) return null;
                  return (
                    <div key={e.id} className="small text-textsec">
                      • <span className="font-semibold text-textmain">{e.nome}</span>{" "}
                      — {e.categoria} · {e.nivel}
                      {e.empresa_id === null ? " · Catálogo" : ""}
                    </div>
                  );
                })}
                {(exPorSessao[s.id] || []).length === 0 && (
                  <div className="small text-textsec">Sem exercícios vinculados.</div>
                )}
              </div>
            )}
          </div>
        ))}
        {lista.length === 0 && <div className="small">Nenhum registro.</div>}
      </div>

      {/* MODAL: seletor de exercícios */}
      {pickerOpen && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-3">
          <div className="card w-full max-w-3xl">
            <div className="font-semibold mb-3">Adicionar exercícios</div>

            <div className="mb-2">
              <input
                className="input"
                placeholder="Buscar por nome, categoria ou nível…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>

            <div
              className="rounded-xl border border-gray-200"
              style={{ maxHeight: 380, overflow: "auto" }}
            >
              {filtrados.map((e) => {
                const checked = selecionados.has(e.id);
                return (
                  <label
                    key={e.id}
                    className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{e.nome}</div>
                      <div className="small text-textsec truncate">
                        {e.categoria} · {e.nivel}
                        {e.empresa_id === null ? " · Catálogo" : ""}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={checked}
                      onChange={() => toggleSelecionado(e.id)}
                    />
                  </label>
                );
              })}
              {filtrados.length === 0 && (
                <div className="small text-center py-6 text-textsec">
                  Nada encontrado.
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 mt-3 sm:justify-end">
              <button
                className="btn btn-primary w-full sm:w-auto"
                onClick={() => setPickerOpen(false)}
              >
                Concluir seleção
              </button>
              <button
                className="btn btn-secondary w-full sm:w-auto"
                onClick={() => setPickerOpen(false)}
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
