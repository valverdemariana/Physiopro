export default function PatientHeader({ p }: { p: any }) {
  return (
    <div className="card mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-bgsec flex items-center justify-center font-bold text-uppli">
            {p.nome?.[0]?.toUpperCase() || "P"}
          </div>
          <div>
            <div className="text-xl font-semibold">{p.nome}</div>
            <div className="small text-textsec">CPF {p.cpf}{p.diagnostico ? ` · ${p.diagnostico}` : ""}</div>
            {(p.telefone || p.email) && <div className="small text-textsec">{p.telefone || ""}{p.telefone && p.email ? " · " : ""}{p.email || ""}</div>}
          </div>
        </div>
        <span className="badge">{p.ativo ? "Ativo" : "Inativo"}</span>
      </div>
    </div>
  );
}
