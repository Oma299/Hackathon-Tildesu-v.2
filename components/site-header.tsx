"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, UserCircle2 } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

export function SiteHeader() {
  const { t } = useLanguage()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") return
    setIsLoggedIn(localStorage.getItem("isLoggedIn") === "true")
    setUserName(localStorage.getItem("userName") ?? "")
  }, [])

  const programDropdown = [
    { label: t("nav.prog.screening"), href: "/screening" },
    { label: t("nav.prog.kids"), href: "/courses?course=kids" },
    { label: t("nav.prog.fluent"), href: "/courses?course=fluent" },
    { label: t("nav.prog.cartoon"), href: "/cartoons" },
  ]

  const navItems = [
    { label: t("nav.about"), href: "#about" },
    { label: t("nav.programs"), href: "/courses", hasDropdown: true },
    { label: t("nav.aboutUs"), href: "/about" },
  ]

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Tildesu home">
          <img src="/tildesu-drop.png" alt="Tildesu" className="h-[5.5rem] w-[5.5rem] object-contain" />
          <div className="leading-tight">
            <span className="block text-3xl font-bold tracking-tight text-[#37beb0]">Tildesu</span>
            <span className="block text-xs text-muted-foreground">{t("header.tagline")}</span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-7 xl:flex">
          {navItems.map((item) =>
            item.hasDropdown ? (
              <div key={item.label} className="group relative">
                <Link
                  href={item.href}
                  className="flex min-w-[13rem] items-center justify-center gap-2 rounded-lg bg-primary px-9 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {item.label}
                  <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
                </Link>
                {/* Dropdown */}
                <div className="invisible absolute left-1/2 top-full z-50 w-72 -translate-x-1/2 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
                  <ul className="overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-xl">
                    {programDropdown.map((sub) =>
                      sub.href ? (
                        <li key={sub.label}>
                          <Link
                            href={sub.href}
                            className="block rounded-xl px-4 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            {sub.label}
                          </Link>
                        </li>
                      ) : (
                        <li key={sub.label}>
                          <span
                            aria-disabled="true"
                            className="flex cursor-not-allowed items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground/60"
                          >
                            {sub.label}
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                              {t("nav.soon")}
                            </span>
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className="flex min-w-[13rem] items-center justify-center gap-2 rounded-lg bg-primary px-9 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-3">
          {isLoggedIn ? (
            /* Parent cabinet — only after successful registration/login */
            <Button
              render={<Link href="/dashboard" />}
              nativeButton={false}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 text-primary-foreground hover:bg-primary/90"
            >
              <UserCircle2 className="h-4 w-4" />
              {`${t("nav.cabinet")}: ${userName || "—"}`}
            </Button>
          ) : (
            <Button
              render={<Link href="/register" />}
              nativeButton={false}
              className="rounded-lg bg-primary px-5 text-primary-foreground hover:bg-primary/90"
            >
              {t("cta.startFree")}
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
