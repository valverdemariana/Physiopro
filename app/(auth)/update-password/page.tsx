"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (password.length < 6) return setMsg("A senha deve ter pelo menos 6 caracteres.");
    if (password !== confirm) return setMsg("As senhas não coincidem.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setMsg(error.message);
    setMsg("Senha atualizada com sucesso. Você já pode entrar.");
  };

  return (
    <div className="container-page max-w-md mx-auto">
      <h1 className="title">Definir nova senha</h1>
      {msg && (
        <div className={`small mb-3 ${msg.includes("sucesso") ? "text-green-600" : "text-red-600"}`}>
          {msg}
        </div>
      )}
      <form className="card space-y-3" onSubmit={submit}>
        <div>
          <div className="label">Nova senha</div>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <div className="label">Confirmar senha</div>
          <input
            className="input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary" disabled={loading}>
          {loading ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </div>
  );
}
