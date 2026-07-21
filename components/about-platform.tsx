"use client"

import { HeartHandshake, Clock, Sparkles } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

export function AboutPlatform() {
  const { t } = useLanguage()

  const cards = [
    {
      icon: HeartHandshake,
      titleKey: "platform.card1.title",
      descKey: "platform.card1.desc",
      iconBg: "bg-primary/10 text-primary",
      cardBg: "bg-primary/5",
    },
    {
      icon: Clock,
      titleKey: "platform.card2.title",
      descKey: "platform.card2.desc",
      iconBg: "bg-rose-100 text-rose-500",
      cardBg: "bg-rose-50",
    },
    {
      icon: Sparkles,
      titleKey: "platform.card3.title",
      descKey: "platform.card3.desc",
      iconBg: "bg-emerald-100 text-emerald-600",
      cardBg: "bg-emerald-50",
    },
  ]

  return (
    <section id="about" className="scroll-mt-24 py-16">
      <div className="max-w-3xl">
        <h2 className="text-balance text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          {t("platform.title")}
        </h2>
        <p className="mt-4 text-lg font-medium text-primary">{t("platform.subtitle")}</p>
        <p className="mt-5 text-pretty leading-relaxed text-muted-foreground">{t("platform.desc")}</p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.titleKey}
            className={`group flex flex-col rounded-3xl ${card.cardBg} p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${card.iconBg} transition-transform duration-300 group-hover:scale-110`}
            >
              <card.icon className="h-7 w-7" />
            </span>
            <h3 className="mt-5 text-xl font-bold text-foreground">{t(card.titleKey)}</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">{t(card.descKey)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
