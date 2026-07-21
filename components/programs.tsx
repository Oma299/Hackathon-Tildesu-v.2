"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, ShieldCheck, X } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

export function Programs() {
  const { t } = useLanguage()
  const [pricingOpen, setPricingOpen] = useState(false)

  return (
    <section id="programs" className="py-12">
      {/* Guarantee block */}
      <div className="flex flex-col justify-center rounded-2xl bg-primary p-8 text-primary-foreground md:p-10">
        <ShieldCheck className="h-10 w-10" />
        <p className="mt-4 text-3xl font-extrabold md:text-4xl">{t("programs.guarantee")}</p>
        <p className="mt-3 max-w-md leading-relaxed text-primary-foreground/85">{t("programs.guaranteeText")}</p>
        <button
          type="button"
          onClick={() => setPricingOpen(true)}
          className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-primary-foreground px-6 py-3 text-sm font-semibold text-primary transition-opacity hover:opacity-90"
        >
          {t("programs.more")} <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Pricing modal */}
      {pricingOpen && <PricingModal onClose={() => setPricingOpen(false)} />}
    </section>
  )
}

function PricingModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()

  const tiers = [
    {
      name: t("pricing.trial.title"),
      price: t("pricing.trial.price") ?? "0$",
      priceValue: "0$",
      period: t("pricing.firstMonth"),
      desc: t("pricing.trial.desc"),
      featured: false,
    },
    {
      name: t("pricing.month.title"),
      priceValue: "10$",
      period: t("pricing.perMonth"),
      desc: t("pricing.month.desc"),
      featured: false,
    },
    {
      name: t("pricing.year.title"),
      priceValue: "100$",
      period: t("pricing.perYear"),
      desc: t("pricing.year.desc"),
      featured: true,
    },
  ]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-card p-6 shadow-2xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close") || "Close"}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground/70 transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <h3 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{t("pricing.title")}</h3>
          <p className="mx-auto mt-2 max-w-lg text-pretty leading-relaxed text-muted-foreground">
            {t("pricing.subtitle")}
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-3xl p-6 transition-transform ${
                tier.featured
                  ? "bg-primary text-primary-foreground shadow-xl md:scale-105"
                  : "border border-border bg-card text-foreground"
              }`}
            >
              {tier.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-4 py-1 text-xs font-bold text-amber-950 shadow">
                  {t("pricing.popular")}
                </span>
              )}

              <p className={`text-lg font-bold ${tier.featured ? "" : "text-foreground"}`}>{tier.name}</p>

              <div className="mt-4 flex items-end gap-1">
                <span className="text-4xl font-extrabold">{tier.priceValue}</span>
                <span className={`mb-1 text-sm ${tier.featured ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {tier.period}
                </span>
              </div>

              <p
                className={`mt-4 flex-1 text-sm leading-relaxed ${
                  tier.featured ? "text-primary-foreground/85" : "text-muted-foreground"
                }`}
              >
                {tier.desc}
              </p>

              <Link
                href="/register"
                className={`mt-6 flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90 ${
                  tier.featured ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                }`}
              >
                {t("pricing.choose")}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
