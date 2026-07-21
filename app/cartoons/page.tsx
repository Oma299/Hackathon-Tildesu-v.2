"use client"

import Link from "next/link"
import { ArrowLeft, Repeat, Wind, Clock, Sparkles } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { useLanguage } from "@/lib/i18n"

export default function CartoonsPage() {
  const { t } = useLanguage()

  const features = [
    { icon: Repeat, titleKey: "cartoons.f1.title", descKey: "cartoons.f1.desc" },
    { icon: Wind, titleKey: "cartoons.f2.title", descKey: "cartoons.f2.desc" },
    { icon: Clock, titleKey: "cartoons.f3.title", descKey: "cartoons.f3.desc" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("cartoons.back")}
        </Link>

        {/* Hero */}
        <div className="mt-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            {t("cartoons.badge")}
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            {t("cartoons.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            {t("cartoons.subtitle")}
          </p>
        </div>

        {/* Video player */}
        <div className="mx-auto mt-10 max-w-3xl">
          <p className="mb-3 text-center text-sm font-semibold text-muted-foreground">{t("cartoons.watch")}</p>
          <div className="overflow-hidden rounded-3xl border border-primary/15 bg-card shadow-xl">
            <video
              controls
              playsInline
              preload="metadata"
              poster="/roadmap-jungle.png"
              className="aspect-video w-full bg-foreground/5"
            >
              <source src="/cartoon-govori-yasno.mp4" type="video/mp4" />
            </video>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.titleKey}
              className="flex flex-col rounded-3xl border border-primary/15 bg-primary/[0.04] p-6"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-foreground">{t(f.titleKey)}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{t(f.descKey)}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 flex justify-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t("cartoons.cta")}
          </Link>
        </div>
      </main>
    </div>
  )
}
