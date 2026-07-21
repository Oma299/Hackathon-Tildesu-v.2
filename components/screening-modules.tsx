"use client"

import Link from "next/link"
import { ArrowLeft, Mic, FileText, Lock, ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

export function ScreeningModules() {
  const { t } = useLanguage()

  const stages = [
    {
      tag: t("screening.stage1.tag"),
      title: t("screening.stage1.title"),
      desc: t("screening.stage1.desc"),
      cta: t("screening.stage1.cta"),
      href: "/screening",
      icon: Mic,
      color: "bg-primary/10 text-primary",
      locked: false,
    },
    {
      tag: t("screening.stage2.tag"),
      title: t("screening.stage2.title"),
      desc: t("screening.stage2.desc"),
      locked: true,
      lockedText: t("screening.stage2.locked"),
      icon: FileText,
      color: "bg-muted text-muted-foreground",
    },
  ]

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("courses.back")}
      </Link>

      <div className="mt-6 text-center">
        <h1 className="text-balance text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          {t("screening.title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
          {t("screening.subtitle")}
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-3xl gap-6 md:grid-cols-2">
        {stages.map((stage) => {
          const Icon = stage.icon
          return (
            <div
              key={stage.tag}
              className={`flex flex-col rounded-3xl border p-6 shadow-sm ${
                stage.locked ? "border-dashed border-border bg-muted/30" : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stage.color}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {stage.tag}
                </span>
              </div>

              <h2 className="mt-5 text-lg font-bold text-foreground">{stage.title}</h2>
              <p className="mt-2 flex-1 text-pretty text-sm leading-relaxed text-muted-foreground">{stage.desc}</p>

              {stage.locked ? (
                <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-muted px-5 py-3 text-sm font-semibold text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  {stage.lockedText}
                </div>
              ) : (
                <Link
                  href={stage.href!}
                  className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {stage.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}
