import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Hero } from "@/components/hero"
import { AboutPlatform } from "@/components/about-platform"
import { HowItWorks } from "@/components/how-it-works"
import { Programs } from "@/components/programs"
import { TrustBanner } from "@/components/trust-banner"

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
        <Hero />
        <AboutPlatform />
        <HowItWorks />
        <Programs />
        <TrustBanner />
      </main>
      <SiteFooter />
    </div>
  )
}
