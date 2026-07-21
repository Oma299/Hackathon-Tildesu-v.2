import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { AiScreening } from "@/components/ai-screening"

export default function ScreeningPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <AiScreening />
      <SiteFooter />
    </div>
  )
}
