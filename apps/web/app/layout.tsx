import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/components/Providers"

export const metadata: Metadata = {
  title: "RepoLens",
  description: "Git repository analytics — hotspots, churn, ownership, and bug patterns.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
