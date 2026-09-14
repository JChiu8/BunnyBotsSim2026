import { ConvexAuthProvider } from "@convex-dev/auth/react"
import { ConvexReactClient } from "convex/react"
import { ThemeProvider } from "next-themes"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "@/App"
import "@/index.css"

const convexUrl = import.meta.env.VITE_CONVEX_URL

if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL is not configured. Run `bunx convex dev` first.")
}

const convex = new ConvexReactClient(convexUrl)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ConvexAuthProvider client={convex}>
        <App />
      </ConvexAuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
