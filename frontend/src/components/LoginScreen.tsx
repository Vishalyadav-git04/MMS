import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { LiveHero } from "@/components/aid/LiveHero";
import { HeroCarousel } from "@/components/aid/HeroCarousel";
import { OrbitLoader } from "@/components/aid/OrbitLoader";
import { BrandEmblem } from "@/components/BrandEmblem";
import { ASSETS } from "@/assets/images";

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
    <div className="mms-root relative flex min-h-screen items-center justify-end overflow-hidden px-4 py-8 pr-6 sm:pr-10 lg:pr-16 xl:pr-24">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="tms-login__slides absolute inset-0">
          <HeroCarousel slides={[...ASSETS.loginSlides]} hideDots />
        </div>
        <div className="mms-login-veil" />
        {/* Atmospherics only — carousel supplies the photos (gotcha #10) */}
        <div className="absolute inset-0 z-[1]">
          <LiveHero
            image={ASSETS.loginHero}
            height={900}
            pinSubject={false}
            calm
            className="mms-login-atmos !h-full"
          />
        </div>
      </div>

      <div className="mms-rise relative z-[2] w-full max-w-[420px]">
        <div className="mms-login-card">
          <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-[#2ea8d5] to-transparent" />

          <div className="relative px-8 pb-8 pt-8 sm:px-9">
            <div className="mb-8 flex flex-col items-center text-center">
              <BrandEmblem size="lg" decorative={false} className="mb-5 rounded-full shadow-sm" />
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#a85711]">
                Indian Army
              </p>
              <h1
                className="mt-2 text-[1.75rem] font-bold tracking-[-0.02em] text-[#15202b]"
                style={{ fontFamily: "var(--font-display, system-ui)" }}
              >
                MISO · MMS
              </h1>
              <div className="my-3 h-px w-16 bg-gradient-to-r from-transparent via-[#14568c]/40 to-transparent" />
              <p className="text-[14px] leading-relaxed text-[#54606c]">
                Sign in with your ADMIN or UNIT account
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5" noValidate={false}>
              <div className="space-y-1">
                <Label
                  htmlFor="username"
                  className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#54606c]"
                >
                  Username
                </Label>
                <div className="group relative">
                  <User
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#14568c]/45 transition-colors group-focus-within:text-[#14568c]"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <Input
                    id="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11 rounded-lg border-[#cddcec] bg-white pl-11 text-[15px] text-[#15202b] shadow-sm placeholder:text-[#616d79]/70 focus-visible:border-[#1d74b8] focus-visible:ring-[3px] focus-visible:ring-[rgba(20,86,140,0.14)]"
                    placeholder="e.g. ADMIN01"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="password"
                  className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#54606c]"
                >
                  Password
                </Label>
                <div className="group relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#14568c]/45 transition-colors group-focus-within:text-[#14568c]"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-lg border-[#cddcec] bg-white pl-11 pr-12 text-[15px] text-[#15202b] shadow-sm placeholder:text-[#616d79]/70 focus-visible:border-[#1d74b8] focus-visible:ring-[3px] focus-visible:ring-[rgba(20,86,140,0.14)]"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-[#616d79] transition-colors hover:bg-[#e8f2fa] hover:text-[#14568c]"
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
                  className="rounded-lg border border-[#b3261e]/35 bg-[rgba(211,32,32,0.12)] px-3.5 py-2.5 text-center text-[14px] leading-snug text-[#b3261e]"
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={busy}
                className="mt-1 h-11 w-full rounded-lg text-[14px] font-semibold tracking-[0.04em] text-white shadow-none transition-colors hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
                style={{
                  backgroundColor: "#14568c",
                  backgroundImage: "linear-gradient(120deg, #14568c, #1d74b8)",
                }}
              >
                {busy ? (
                  <>
                    <OrbitLoader label="Signing in" />
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
