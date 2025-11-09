"use client";

type Props = {
  pacienteId: string;
  name?: string;
  code?: number | null;
};

export default function PatientHeader({ pacienteId, name, code }: Props) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-full bg-uppli/10 text-uppli flex items-center justify-center font-semibold">
        {(name?.[0] ?? "P").toUpperCase()}
      </div>
      <div>
        <div className="text-xl font-semibold">{name ?? "Paciente"}</div>
        {code ? (
          <div className="small text-textsec">Nº {code}</div>
        ) : (
          <div className="small text-textsec">
            ID: {pacienteId.slice(0, 6)}…{pacienteId.slice(-4)}
          </div>
        )}
      </div>
    </div>
  );
}
