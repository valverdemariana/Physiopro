"use client";

import Link from "next/link";

type TabsProps = {
  pacienteId: string;
  active?: "dados" | "anamnese" | "sessoes";
};

const cx = (...xs: (string | false | undefined)[]) => xs.filter(Boolean).join(" ");

export default function PatientTabs({ pacienteId, active = "dados" }: TabsProps) {
  return (
    <div className="border-b mb-4 flex gap-6 text-sm">
      <Link
        href={`/pacientes/${pacienteId}`}
        className={cx(
          "pb-3 -mb-px",
          active === "dados"
            ? "border-b-2 border-uppli text-textmain font-medium"
            : "text-textsec hover:text-textmain"
        )}
      >
        Informações
      </Link>
      <Link
        href={`/anamnese/${pacienteId}`}
        className={cx(
          "pb-3 -mb-px",
          active === "anamnese"
            ? "border-b-2 border-uppli text-textmain font-medium"
            : "text-textsec hover:text-textmain"
        )}
      >
        Anamnese
      </Link>
      <Link
        href={`/sessoes/${pacienteId}`}
        className={cx(
          "pb-3 -mb-px",
          active === "sessoes"
            ? "border-b-2 border-uppli text-textmain font-medium"
            : "text-textsec hover:text-textmain"
        )}
      >
        Sessões
      </Link>
    </div>
  );
}
