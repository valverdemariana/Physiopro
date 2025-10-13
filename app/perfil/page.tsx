
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function PerfilPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [empresa, setEmpresa] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { window.location.href = "/login"; return; }

      const { data: u } = await supabase.from("usuarios").select("*").eq("id", auth.user.id).maybeSingle();
      setUsuario(u || null);

      if (u?.empresa_id) {
        const { data: e } = await supabase.from("empresas").select("*").eq("id", u.empresa_id).maybeSingle();
        setEmpresa(e || null);
      }
    };
    load();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div>
      <h1 className="title">Perfil</h1>

      <div className="grid gap-3">
        <div className="card">
          <div className="font-semibold mb-1">Profissional</div>
          <div className="small">{usuario?.nome} · {usuario?.email}</div>
          <div className="small">Cargo: {usuario?.cargo}</div>
        </div>
        <div className="card">
          <div className="font-semibold mb-1">Empresa</div>
          <div className="small">{empresa?.nome}</div>
          <div className="small">{empresa?.cnpj || empresa?.cpf}</div>
          <div className="small">{empresa?.telefone} · {empresa?.email}</div>
        </div>
      </div>

      <button className="btn btn-secondary mt-4" onClick={logout}>Sair</button>
      <div className="mt-6 text-center text-textsec">Powered by Uppli</div>
    </div>
  );
}
