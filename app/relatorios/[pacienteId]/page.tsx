
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import jsPDF from "jspdf";
import { formatBRDate } from "@/lib/utils";

export default function RelatoriosPacientePage() {
  const { pacienteId } = useParams<{ pacienteId: string }>();
  const [paciente, setPaciente] = useState<any>(null);
  const [sessoes, setSessoes] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: p } = await supabase.from("pacientes").select("*").eq("id", pacienteId).maybeSingle();
      setPaciente(p);
      const { data: s } = await supabase.from("sessoes").select("*").eq("paciente_id", pacienteId).order("data", { ascending: true });
      setSessoes(s || []);
    };
    load();
  }, [pacienteId]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatório do Paciente - PhysioPro", 14, 20);
    if (paciente) {
      doc.setFontSize(12);
      doc.text(`Paciente: ${paciente.nome} (CPF ${paciente.cpf})`, 14, 30);
    }
    let y = 40;
    sessoes.forEach((s) => {
      doc.text(`${formatBRDate(s.data)} - ${s.tipo} · Dor: ${s.dor ?? 0} · ${s.evolucao || ""}`, 14, y);
      y += 8;
      if (y > 280) { doc.addPage(); y = 20; }
    });
    doc.save(`relatorio_${paciente?.nome || "paciente"}.pdf`);
  };

  return (
    <div>
      <h1 className="title">Relatórios</h1>
      {paciente && (
        <div className="card mb-3">
          <div className="font-semibold">{paciente.nome}</div>
          <div className="small">CPF {paciente.cpf}</div>
        </div>
      )}
      <div className="card">
        <div className="font-semibold mb-2">Resumo de sessões ({sessoes.length})</div>
        <button className="btn btn-primary mb-3" onClick={exportPDF}>Exportar PDF</button>
        <div className="space-y-1">
          {sessoes.map(s => (
            <div key={s.id} className="text-sm">
              {formatBRDate(s.data)} · {s.tipo} · Dor {s.dor ?? 0}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
