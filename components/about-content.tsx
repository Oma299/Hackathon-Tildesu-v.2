"use client"

import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { Target, Sparkles, Users, MessageCircle } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

// Общая ссылка поддержки WhatsApp
const WHATSAPP_SUPPORT_URL = "https://wa.me/77073183710"

export function AboutContent() {
  const { t } = useLanguage()

  const sections = [
    { icon: Target, title: t("about.mission.title"), text: t("about.mission.text") },
    { icon: Sparkles, title: t("about.how.title"), text: t("about.how.text") },
    { icon: Users, title: t("about.who.title"), text: t("about.who.text") },
  ]

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-4 py-16 md:px-8 md:py-24">
        <div className="flex flex-col items-center gap-4 text-center">
          <img src="/tildesu-drop.png" alt="Tildesu" className="h-20 w-20 object-contain" />
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            {t("about.title")} <span className="text-[#37beb0]">Tildesu</span>
          </h1>
          <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground">{t("about.subtitle")}</p>
        </div>

        <div className="mt-12 flex flex-col gap-6">
          {sections.map((s) => {
            const Icon = s.icon
            return (
              <article key={s.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-semibold text-foreground">{s.title}</h2>
                    <p className="text-pretty leading-relaxed text-muted-foreground">{s.text}</p>
                  </div>
                </div>
              </article>
            )
          })}

          {/* Contact via WhatsApp */}
          <article className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-sm md:p-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">{t("about.contact.title")}</h2>
              <p className="leading-relaxed text-primary-foreground/85">{t("about.contact.text")}</p>
            </div>

            <div className="mt-5">
              <a
                href={WHATSAPP_SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-xl bg-primary-foreground px-6 py-3.5 text-base font-semibold text-primary shadow-sm transition-opacity hover:opacity-90"
              >
                <MessageCircle className="h-5 w-5" />
                Написать в WhatsApp
              </a>
            </div>
          </article>
        </div>

        <div className="mt-12 text-center">
          <Link href="/" className="text-sm font-medium text-primary hover:underline">
            {t("about.back")}
          </Link>
        </div>
      </section>
    </main>
  )
}
