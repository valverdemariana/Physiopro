
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import PatientHeader from "@/components/PatientHeader";

export default function PacienteDetails() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [paciente, setPaciente] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("pacientes").select("*").eq("id", params.id).maybeSingle();
      if (!data) router.push("/pacientes");
      setPaciente(data);
    };
    load();
  }, [params.id, router]);

  if (!paciente) return null;

  return (
    <div>
      <PatientHeader p={paciente} />

      <div className="grid md:grid-cols-3 gap-3">
        <Link className="card hover:shadow-md transition" href={`/anamnese/${paciente.id}`}>
          <div className="font-semibold">Anamnese</div>
          <div className="small text-textsec">Avaliação inicial e histórico</div>
        </Link>
        <Link className="card hover:shadow-md transition" href={`/sessoes/${paciente.id}`}>
          <div className="font-semibold">Sessões</div>
          <div className="small text-textsec">Registros e evolução</div>
        </Link>
        <Link className="card hover:shadow-md transition" href={`/relatorios/${paciente.id}`}>
          <div className="font-semibold">Relatórios</div>
          <div className="small text-textsec">PDF e indicadores</div>
        </Link>
      </div>
    </div>
  );
}
