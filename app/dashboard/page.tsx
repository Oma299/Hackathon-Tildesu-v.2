import { SiteHeader } from "@/components/site-header"
import { ParentDashboard } from "@/components/parent-dashboard"

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="px-4 py-12 md:px-8 md:py-16">
        <ParentDashboard />
      </section>
    </main>
  )
}
