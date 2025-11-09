"use client";
import Link from "next/link";

type Props = {
  pacienteId: string;
  active?: "dados" | "anamnese" | "sessoes";
};

export default function PatientTabs({ pacienteId, active = "dados" }: Props) {
  const tab = (key: Props["active"], href: string, label: string) => (
    <Link
      href={href}
      className={`pb-3 -mb-px ${
        active === key
          ? "border-b-2 border-uppli text-textmain font-medium"
          : "text-textsec hover:text-textmain"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="border-b mb-4 flex gap-6 text-sm">
      {tab("dados", `/pacientes/${pacienteId}`, "Informações")}
      {tab("anamnese", `/anamnese/${pacienteId}`, "Anamnese")}
      {tab("sessoes", `/sessoes/${pacienteId}`, "Sessões")}
    </div>
  );
}
