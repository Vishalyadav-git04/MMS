import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, Lock, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Login failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-end overflow-hidden px-4 py-8 pr-6 font-sans sm:pr-10 lg:pr-16 xl:pr-24">
      {/* Army imagery background — keep subject visible; shade only behind the form */}
      <div className="pointer-events-none absolute inset-0">
        <img
          src="/login/army-bg.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[42%_center] scale-[1.02]"
        />
        {/* Soft left→right wash: image stays clear on the left, readable behind form on the right */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-black/20 to-[#07120c]/72" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07120c]/45 via-transparent to-black/20" />
      </div>

      <div className="relative w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-500">
        <div className="overflow-hidden rounded-2xl border border-[#c5a35a]/35 bg-[#0c1c14]/55 shadow-[0_32px_80px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-[#c5a35a] to-transparent" />

          <div className="px-8 pb-8 pt-8 sm:px-9">
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-5 grid h-16 w-16 place-items-center rounded-full border border-[#c5a35a]/50 bg-gradient-to-b from-[#1f4632] to-[#14291e] text-[#c5a35a] shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                <Shield className="h-8 w-8" strokeWidth={1.75} />
              </div>
              <p className="font-display text-[13px] font-semibold uppercase tracking-[0.38em] text-[#c5a35a]">
                Indian Army
              </p>
              <h1 className="mt-2 font-display text-[1.85rem] font-semibold tracking-[0.06em] text-[#f5f1e8]">
                MISO · MMS
              </h1>
              <div className="my-3 h-px w-16 bg-gradient-to-r from-transparent via-[#c5a35a]/55 to-transparent" />
              <p className="text-[15px] leading-relaxed text-[#f5f1e8]/55">
                Sign in with your ADMIN or UNIT account
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-1">
                <Label
                  htmlFor="username"
                  className="text-[13px] font-medium uppercase tracking-[0.16em] text-[#f5f1e8]/65"
                >
                  Username
                </Label>
                <div className="group relative">
                  <User
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c5a35a]/55 transition-colors group-focus-within:text-[#c5a35a]"
                    strokeWidth={2}
                  />
                  <Input
                    id="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 rounded-lg border-[#c5a35a]/20 bg-[#07120c]/75 pl-11 text-[17px] text-[#f5f1e8] shadow-inner placeholder:text-[#f5f1e8]/28 focus-visible:border-[#c5a35a]/55 focus-visible:ring-[#c5a35a]/30"
                    placeholder="Enter username"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="password"
                  className="text-[13px] font-medium uppercase tracking-[0.16em] text-[#f5f1e8]/65"
                >
                  Password
                </Label>
                <div className="group relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c5a35a]/55 transition-colors group-focus-within:text-[#c5a35a]"
                    strokeWidth={2}
                  />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-lg border-[#c5a35a]/20 bg-[#07120c]/75 pl-11 pr-12 text-[17px] text-[#f5f1e8] shadow-inner placeholder:text-[#f5f1e8]/28 focus-visible:border-[#c5a35a]/55 focus-visible:ring-[#c5a35a]/30"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-[#f5f1e8]/40 transition-colors hover:bg-[#c5a35a]/10 hover:text-[#c5a35a]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" strokeWidth={2} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-400/35 bg-red-950/55 px-3.5 py-2.5 text-center text-[14px] leading-snug text-red-100"
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={busy}
                className="mt-1 h-12 w-full rounded-lg bg-[#c5a35a] text-[15px] font-semibold uppercase tracking-[0.14em] text-[#1a1408] shadow-[0_10px_28px_rgba(197,163,90,0.28)] transition-all hover:bg-[#d4b56a] hover:shadow-[0_12px_32px_rgba(197,163,90,0.35)] active:scale-[0.99] disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
