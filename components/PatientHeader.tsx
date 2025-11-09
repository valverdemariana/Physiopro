"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function initials(name: string) {
  const p = (name || "").trim().split(/\s+/);
  if (!p.length) return "P";
  const a = p[0]?.[0] ?? "";
  const b = p.length > 1 ? p[p.length - 1][0] : "";
  return (a + b).toUpperCase();
}

type PatientHeaderProps = { pacienteId: string };

export default function PatientHeader({ pacienteId }: PatientHeaderProps) {
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pacientes")
        .select("nome,codigo")
        .eq("id", pacienteId)
        .maybeSingle();

      if (data) {
        setNome(data.nome ?? "");
        setCodigo(
          Object.prototype.hasOwnProperty.call(data, "codigo")
            ? (data as any).codigo ?? null
            : null
        );
      }
    })();
  }, [pacienteId]);

  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-full bg-uppli/10 text-uppli flex items-center justify-center font-semibold">
        {initials(nome || "Paciente")}
      </div>
      <div>
        <h1 className="title m-0">{nome || "Paciente"}</h1>
        <div className="small text-textsec">
          {codigo ? `Nº ${codigo}` : `ID: ${pacienteId.slice(0, 6)}…${pacienteId.slice(-4)}`}
        </div>
      </div>
    </div>
  );
}
