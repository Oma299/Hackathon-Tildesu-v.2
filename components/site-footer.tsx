"use client"

import { ShieldAlert } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

export function SiteFooter() {
  const { t } = useLanguage()

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-muted-foreground">{t("footer.disclaimer")}</p>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground/70">
          {`© ${new Date().getFullYear()} Tildesu · AI Early Speech Screening Platform`}
        </p>
      </div>
    </footer>
  )
}
