"use client";
import Link from "next/link";

type Props = {
  pacienteId: string;
  active: "info" | "anamnese" | "sessoes";
};

export default function PatientTabs({ pacienteId, active }: Props) {
  const base = "pb-3 -mb-px text-sm";
  const on = "border-b-2 border-uppli text-textmain font-medium";
  const off = "text-textsec hover:text-textmain";

  return (
    <div className="border-b mb-4 flex gap-6">
      <Link href={`/pacientes/${pacienteId}`} className={`${base} ${active==="info" ? on : off}`}>
        Informações
      </Link>
      <Link href={`/anamnese/${pacienteId}`} className={`${base} ${active==="anamnese" ? on : off}`}>
        Anamnese
      </Link>
      <Link href={`/sessoes/${pacienteId}`} className={`${base} ${active==="sessoes" ? on : off}`}>
        Sessões
      </Link>
    </div>
  );
}
