"use client"

import { ShieldCheck } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

export function TrustBanner() {
  const { t } = useLanguage()

  return (
    <section className="mt-6 flex flex-col items-start gap-4 rounded-2xl bg-card p-6 md:flex-row md:items-center">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{t("trust.subtitle")}</p>
        </div>
      </div>
    </section>
  )
}
