"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotEmail, setForgotEmail] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/dashboard");
  };

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg(null);
    if (!forgotEmail) return setForgotMsg("Informe seu e-mail.");
    const redirectTo = `${window.location.origin}/update-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, { redirectTo });
    if (error) setForgotMsg(error.message);
    else setForgotMsg("Enviamos um link de redefinição para seu e-mail.");
  };

  return (
    <div className="flex flex-col items-center">
      {/* Cabeçalho: somente texto, um pouco mais escuro */}
      <div className="mt-8 mb-6">
        <div
          className="text-3xl font-extrabold tracking-tight"
          style={{ color: "#0F172A" }} // mais escuro que #1C1C1E
        >
          PhysioPro
        </div>
      </div>

      <p className="text-center text-textsec mb-6 max-w-xs">
        Gestão inteligente para profissionais de fisioterapia.
      </p>

      {/* Card do formulário */}
      <form onSubmit={onSubmit} className="w-full max-w-md card space-y-4">
        {error && <div className="small text-red-600">{error}</div>}

        <input
          className="input h-12 text-base"
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-label="E-mail"
        />

        <input
          className="input h-12 text-base"
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          aria-label="Senha"
        />

        <div className="flex justify-end -mt-1">
          <button
            type="button"
            className="text-uppli text-sm hover:underline"
            onClick={() => {
              setForgotOpen(true);
              setForgotMsg(null);
              setForgotEmail(email);
            }}
          >
            Esqueceu sua senha?
          </button>
        </div>

        <button className="btn btn-primary w-full h-12 text-lg" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <div className="text-center small">
          Não tem conta?{" "}
          <Link href="/register" className="text-uppli hover:underline">
            Cadastre-se
          </Link>
        </div>
      </form>

      {/* Removido o texto de versão aqui */}

      {/* Modal de recuperação de senha */}
      {forgotOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setForgotOpen(false)}
        >
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Recuperar senha</div>
            <p className="small mb-3">
              Informe seu e-mail. Enviaremos um link para redefinir sua senha.
            </p>
            {forgotMsg && (
              <div
                className={`small mb-2 ${
                  forgotMsg.startsWith("Enviamos") ? "text-green-600" : "text-red-600"
                }`}
              >
                {forgotMsg}
              </div>
            )}
            <form className="space-y-3" onSubmit={onForgot}>
              <input
                className="input h-11"
                type="email"
                placeholder="seu@email.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn btn-secondary" onClick={() => setForgotOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Enviar link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
