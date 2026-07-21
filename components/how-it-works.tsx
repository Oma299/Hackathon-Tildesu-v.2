"use client"

import Link from "next/link"
import { Clapperboard, BookOpen, GraduationCap, ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

export function HowItWorks() {
  const { t } = useLanguage()

  const cards = [
    {
      icon: Clapperboard,
      titleKey: "dir.card2.title",
      descKey: "dir.card2.desc",
      iconBg: "bg-primary/10 text-primary",
      href: "/cartoons",
    },
    {
      icon: BookOpen,
      titleKey: "dir.card3.title",
      descKey: "dir.card3.desc",
      iconBg: "bg-primary/10 text-primary",
      href: "/courses?course=kids",
    },
    {
      icon: GraduationCap,
      titleKey: "dir.card4.title",
      descKey: "dir.card4.desc",
      iconBg: "bg-primary/10 text-primary",
      href: "/courses?course=fluent",
    },
  ]

  return (
    <section id="how" className="scroll-mt-24 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          {t("dir.title")}
        </h2>
        <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">{t("dir.subtitle")}</p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.titleKey}
            className="flex flex-col rounded-3xl border border-primary/15 bg-primary/[0.04] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${card.iconBg}`}
            >
              <card.icon className="h-7 w-7" />
            </span>
            <h3 className="mt-5 text-xl font-bold text-foreground">{t(card.titleKey)}</h3>
            <p className="mt-3 flex-1 leading-relaxed text-muted-foreground">{t(card.descKey)}</p>
            <Link
              href={card.href}
              className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t("dir.choose")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
