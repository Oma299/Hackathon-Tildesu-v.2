"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ScreeningModules } from "@/components/screening-modules"
import { FluentCourse } from "@/components/fluent-course"
import { KidsGame } from "@/components/kids-game"
import { useLanguage } from "@/lib/i18n"

type CourseKey = "kids" | "fluent"

function CoursesContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const course = searchParams.get("course") as CourseKey | null

  // No stage selected -> show the AI diagnostics module overview
  if (course !== "kids" && course !== "fluent") {
    return <ScreeningModules />
  }

  const stageTitle = course === "kids" ? t("courses.tab.kids") : t("courses.tab.fluent")

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <Link
        href="/courses"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("courses.back")}
      </Link>

      <div className="mt-6 text-center">
        <h1 className="text-balance text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          {stageTitle}
        </h1>
      </div>

      <div className="mt-10">{course === "kids" ? <KidsGame /> : <FluentCourse />}</div>
    </main>
  )
}

export default function CoursesPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Suspense fallback={null}>
        <CoursesContent />
      </Suspense>
      <SiteFooter />
    </div>
  )
}
