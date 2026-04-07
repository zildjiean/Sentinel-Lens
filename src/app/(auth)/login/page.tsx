"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { window.location.href = "/"; }
  }

  async function handleOAuthLogin(provider: "google" | "github") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/callback` },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight">Sentinel Lens</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-on-surface-variant mt-2">Cybersecurity Intelligence</p>
        </div>

        <div className="bg-surface-container-low rounded-xl p-8 space-y-6">
          <div>
            <h2 className="font-headline text-xl font-semibold text-on-surface">Sign In</h2>
            <p className="text-sm text-on-surface-variant mt-1">Access your intelligence dashboard</p>
          </div>

          {error && <div className="bg-error/10 text-error text-sm px-4 py-3 rounded-lg">{error}</div>}

          <div className="space-y-3">
            <Button variant="secondary" size="lg" className="w-full" onClick={() => handleOAuthLogin("google")}>Continue with Google</Button>
            <Button variant="secondary" size="lg" className="w-full" onClick={() => handleOAuthLogin("github")}>Continue with GitHub</Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-outline-variant/20" />
            <span className="text-xs text-on-surface-variant uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-outline-variant/20" />
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
