"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n"
import { Mail, Lock, User, UserCog, Check } from "lucide-react"

type Mode = "register" | "login"

export function AuthForm() {
  const { t } = useLanguage()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("register")
  const [submitted, setSubmitted] = useState(false)
  const [parentName, setParentName] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const isRegister = mode === "register"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (typeof window !== "undefined") {
      localStorage.setItem("isLoggedIn", "true")
      localStorage.setItem("userName", parentName.trim())
    }
    router.push("/dashboard")
  }

  return (
    <div className="w-full max-w-md">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
        {/* Tabs */}
        <div className="grid grid-cols-2 border-b border-border">
          {(["register", "login"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setSubmitted(false)
              }}
              className={`py-4 text-sm font-semibold transition-colors ${
                mode === m
                  ? "bg-primary/10 text-primary"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "register" ? t("auth.register.tab") : t("auth.login.tab")}
            </button>
          ))}
        </div>

        <div className="p-7">
          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="h-7 w-7" />
              </div>
              <p className="text-pretty leading-relaxed text-foreground">{t("auth.success")}</p>
              <Link href="/" className="text-sm font-medium text-primary hover:underline">
                {t("auth.back")}
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col gap-1.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {isRegister ? t("auth.register.title") : t("auth.login.title")}
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {isRegister ? t("auth.register.subtitle") : t("auth.login.subtitle")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Field icon={<UserCog className="h-4 w-4" />} label={t("auth.parentName")}>
                  <input
                    id="parentName"
                    type="text"
                    required
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder={t("auth.parentName.ph")}
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                </Field>

                {isRegister && (
                  <Field icon={<User className="h-4 w-4" />} label={t("auth.name")}>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("auth.name.ph")}
                      className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                    />
                  </Field>
                )}

                <Field icon={<Mail className="h-4 w-4" />} label={t("auth.email")}>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.email.ph")}
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                </Field>

                <Field icon={<Lock className="h-4 w-4" />} label={t("auth.password")}>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.password.ph")}
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                </Field>

                <Button
                  type="submit"
                  size="lg"
                  className="mt-2 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isRegister ? t("auth.register.submit") : t("auth.login.submit")}
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-muted-foreground">
                {isRegister ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
                <button
                  type="button"
                  onClick={() => setMode(isRegister ? "login" : "register")}
                  className="font-semibold text-primary hover:underline"
                >
                  {isRegister ? t("auth.toLogin") : t("auth.toRegister")}
                </button>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary">
          {t("auth.back")}
        </Link>
      </div>
    </div>
  )
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-3 transition-colors focus-within:border-primary">
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        {children}
      </div>
    </label>
  )
}
