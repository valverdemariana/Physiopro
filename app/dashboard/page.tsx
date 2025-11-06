"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import CardStat from "@/components/CardStat";
import { Users, CalendarDays, Moon, Sun } from "lucide-react";
import WeekAgenda from "@/components/WeekAgenda";

function toTitle(s?: string) {
  if (!s) return "";
  return s
    .replace(/[_\.]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Evita "Dra Dra" quando o nome já vem com título (Dr/Dra/Doutor/Doutora) */
function buildGreeting(name?: string) {
  const clean = (name || "").trim();
  if (!clean) return "profissional";

  const words = clean.split(/\s+/);
  const firstWord = words[0] || "";
  const hasTitle = /^(dr|dra|doutor|doutora)\.?$/i.test(firstWord);

  const mapTitle = (w: string) => {
    const k = w.toLowerCase().replace(/\./g, "");
    if (k === "dra" || k === "doutora") return "Dra";
    if (k === "dr" || k === "doutor") return "Dr";
    return "Dra";
  };

  if (hasTitle) {
    const title = mapTitle(firstWord);
    const firstName = words[1] ? toTitle(words[1]) : "";
    return [title, firstName].filter(Boolean).join(" ");
  }

  const firstName = toTitle(words[0]);
  return `Dra ${firstName}`;
}

export default function DashboardPage() {
  const [consultasHoje, setConsultasHoje] = useState<number>(0);
  const [pacientesAtivos, setPacientesAtivos] = useState<number>(0);
  const [nome, setNome] = useState<string>("");

  // ⬇️ usa a função que trata títulos
  const saudacao = useMemo(() => buildGreeting(nome), [nome]);

  // Controles da agenda: view e tema (persistidos)
  const [agendaView, setAgendaView] = useState<"week" | "month">(
    () => (typeof window !== "undefined" && (localStorage.getItem("agenda:view") as "week" | "month")) || "week"
  );
  const [agendaTheme, setAgendaTheme] = useState<"light" | "dark">(
    () => (typeof window !== "undefined" && (localStorage.getItem("agenda:theme") as "light" | "dark")) || "light"
  );

  useEffect(() => {
    const load = async () => {
      const auth = await supabase.auth.getUser();
      const u = auth.data.user;
      if (!u) {
        window.location.href = "/login";
        return;
      }

      // 1) tenta na tabela usuarios
      const { data: row } = await supabase
        .from("usuarios")
        .select("nome")
        .eq("id", u.id)
        .maybeSingle();

      if (row?.nome) {
        setNome(row.nome);
      } else {
        // 2) fallback: full_name do auth
        const metaName =
          (u.user_metadata as any)?.full_name ||
          (u.user_metadata as any)?.name;
        if (metaName) {
          setNome(toTitle(metaName));
        } else if (u.email) {
          // 3) fallback: parte antes do @ do e-mail
          const localPart = u.email.split("@")[0];
          setNome(toTitle(localPart));
        }
      }

      // métricas
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const amanha = new Date(hoje);
      amanha.setDate(hoje.getDate() + 1);

      const { count: countSessoes } = await supabase
        .from("sessoes")
        .select("*", { count: "exact", head: true })
        .gte("data", hoje.toISOString())
        .lt("data", amanha.toISOString())
        .neq("status", "cancelado");

      const { count: countPac } = await supabase
        .from("pacientes")
        .select("*", { count: "exact", head: true })
        .eq("ativo", true);

      setConsultasHoje(countSessoes || 0);
      setPacientesAtivos(countPac || 0);
    };
    load();
  }, []);

  // Persistência simples dos controles
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("agenda:view", agendaView);
      localStorage.setItem("agenda:theme", agendaTheme);
    }
  }, [agendaView, agendaTheme]);

  return (
    <div className="space-y-4">
      {/* Saudação */}
      <div className="mb-2">
        <div className="text-sm text-textsec">Bem-vindo(a)</div>
        <h1 className="title">Olá, {saudacao} 👋</h1>
        <div className="text-textsec">Bem-vindo ao seu painel de gestão.</div>
      </div>

      {/* Cards clicáveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <CardStat
          title={`${consultasHoje}`}
          subtitle="Consultas do dia"
          right={<CalendarDays className="text-uppli" />}
          href="/agenda?view=today"
        />
        <CardStat
          title={`${pacientesAtivos}`}
          subtitle="Pacientes ativos"
          right={<Users className="text-uppli" />}
          href="/pacientes?onlyActive=1"
        />
      </div>

      {/* Controles da Agenda */}
      <div className="flex items-center justify-between">
        <div className="font-semibold text-textmain">Agenda</div>
        <div className="flex items-center gap-2">
          {/* View: Semana / Mês */}
          <div className="rounded-xl bg-bgsec p-1">
            <button
              className={`px-3 py-1 rounded-lg text-sm ${agendaView === "week" ? "bg-white shadow-soft" : ""}`}
              onClick={() => setAgendaView("week")}
              aria-pressed={agendaView === "week"}
            >
              Semana
            </button>
            <button
              className={`px-3 py-1 rounded-lg text-sm ${agendaView === "month" ? "bg-white shadow-soft" : ""}`}
              onClick={() => setAgendaView("month")}
              aria-pressed={agendaView === "month"}
            >
              Mês
            </button>
          </div>

          {/* Tema: claro/escuro (aplica só ao calendário) */}
          <button
            className="badge"
            onClick={() => setAgendaTheme((t) => (t === "light" ? "dark" : "light"))}
            title={agendaTheme === "light" ? "Mudar para tema escuro" : "Mudar para tema claro"}
          >
            {agendaTheme === "light" ? <><Moon className="w-4 h-4 mr-1" /> Escuro</> : <><Sun className="w-4 h-4 mr-1" /> Claro</>}
          </button>
        </div>
      </div>

      {/* Agenda da semana/mês (tema e view) */}
      <WeekAgenda view={agendaView} theme={agendaTheme} mobileScroll />
    </div>
  );
}
