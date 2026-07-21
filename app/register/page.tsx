import { SiteHeader } from "@/components/site-header"
import { AuthForm } from "@/components/auth-form"

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="flex items-center justify-center px-4 py-16 md:py-24">
        <AuthForm />
      </section>
    </main>
  )
}
