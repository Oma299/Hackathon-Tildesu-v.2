import type { Metadata } from "next"
import { AboutContent } from "@/components/about-content"

export const metadata: Metadata = {
  title: "О проекте Tildesu",
  description:
    "Tildesu — интерактивная платформа, помогающая детям справиться с заиканием и обрести уверенность в общении.",
}

export default function AboutPage() {
  return <AboutContent />
}
