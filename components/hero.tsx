"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowRight, Mic, Clapperboard, Gamepad2, BarChart3, ShieldCheck } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

export function Hero() {
  const { t } = useLanguage()

  const features = [
    { icon: Mic, label: t("hero.feature.diagnostic"), color: "bg-primary/10 text-primary" },
    { icon: Clapperboard, label: t("hero.feature.cartoons"), color: "bg-rose-100 text-rose-500" },
    { icon: Gamepad2, label: t("hero.feature.games"), color: "bg-sky-100 text-sky-500" },
    { icon: BarChart3, label: t("hero.feature.progress"), color: "bg-emerald-100 text-emerald-500" },
    { icon: ShieldCheck, label: t("hero.feature.guarantee"), color: "bg-amber-100 text-amber-500" },
  ]

  return (
    <section className="grid items-center gap-10 py-10 lg:grid-cols-2 lg:py-16">
      {/* Left */}
      <div className="space-y-7">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          {t("hero.badge")}
        </span>

        <h1 className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground md:text-5xl">
          {t("hero.title1")}
          <br />
          <span className="bg-gradient-to-r from-primary to-rose-500 bg-clip-text text-transparent">
            {t("hero.title2")}
          </span>
        </h1>

        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground/70">
          AI Early Speech Screening Platform
        </p>

        <p className="max-w-xl text-pretty leading-relaxed text-muted-foreground">{t("hero.subtitle")}</p>

        <div className="flex flex-wrap items-center gap-4">
          <Button
            render={<Link href="/courses" />}
            nativeButton={false}
            size="lg"
            className="flex items-center gap-2 rounded-xl bg-primary px-7 text-primary-foreground hover:bg-primary/90"
          >
            {t("cta.aiScreening")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Feature icons */}
        <ul className="grid grid-cols-2 gap-x-6 gap-y-5 pt-4 sm:grid-cols-3 lg:grid-cols-5">
          {features.map((f) => (
            <li key={f.label} className="flex flex-col items-start gap-2">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${f.color}`}>
                <f.icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-medium leading-tight text-muted-foreground">{f.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Right visual */}
      <div className="relative">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary/10 via-accent to-rose-100/40 p-4">
          <img
            src="/hero-child.png"
            alt={t("hero.imgAlt")}
            className="ml-auto h-auto w-[72%] rounded-2xl object-cover"
          />

          {/* Mascot */}
          <img
            src="/mascot-robot.png"
            alt={t("hero.mascotAlt")}
            className="absolute bottom-6 left-2 w-40 drop-shadow-xl md:w-48"
          />

          {/* Chat bubble */}
          <div className="absolute left-6 top-6 max-w-[220px] rounded-2xl bg-card p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mic className="h-4 w-4" />
              </span>
              <p className="text-sm leading-snug text-foreground">{t("hero.chat")}</p>
            </div>
          </div>

          {/* Progress card */}
          <div className="absolute bottom-6 right-4 flex items-center gap-4 rounded-2xl bg-card p-4 shadow-lg">
            <div>
              <p className="text-sm font-bold text-foreground">{t("hero.greatWork")}</p>
              <p className="text-xs text-muted-foreground">{t("hero.speakBetter")}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-primary text-sm font-bold text-primary">
              82%
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
