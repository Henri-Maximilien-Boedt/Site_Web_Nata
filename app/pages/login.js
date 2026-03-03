import Head from "next/head";
import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";

// Page de connexion admin
// Accès public — redirige vers /admin après connexion réussie

export default function Login() {
  const router = useRouter();
  const redirect = router.query.redirect || "/admin";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    router.push(redirect);
  }

  return (
    <>
      <Head>
        <title>Connexion — NATA Bar</title>
      </Head>

      <main
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "var(--bg-main)" }}
      >
        <div
          className="w-full max-w-sm p-8 rounded-lg border"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--bg-input)" }}
        >
          <h1
            className="font-title text-4xl mb-1 text-center"
            style={{ color: "var(--text-primary)" }}
          >
            NATA <span style={{ color: "var(--accent)" }}>ADMIN</span>
          </h1>
          <p
            className="text-sm text-center mb-8"
            style={{ color: "var(--text-secondary)" }}
          >
            Espace gérant
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 px-4 rounded text-sm w-full border"
              style={{
                backgroundColor: "var(--bg-input)",
                color: "var(--text-primary)",
                borderColor: "var(--bg-input)",
              }}
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 px-4 rounded text-sm w-full border"
              style={{
                backgroundColor: "var(--bg-input)",
                color: "var(--text-primary)",
                borderColor: "var(--bg-input)",
              }}
            />

            {error && (
              <p className="text-sm text-center" style={{ color: "#ef4444" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-12 rounded font-body font-bold text-white transition-opacity"
              style={{
                backgroundColor: "var(--accent)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
