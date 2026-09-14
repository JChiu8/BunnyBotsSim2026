import { ShieldCheck } from "lucide-react"

export function ProtectedPage() {
  return (
    <section className="max-w-xl space-y-3">
      <ShieldCheck className="size-8" />
      <h1 className="text-3xl font-semibold tracking-tight">Protected route</h1>
      <p className="text-muted-foreground">
        Convex Auth verified this session before React Router rendered the route.
      </p>
    </section>
  )
}
