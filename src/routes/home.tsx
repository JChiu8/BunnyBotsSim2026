import { Database, Layers3, Route, ShieldCheck } from "lucide-react"

const foundations = [
  { icon: Route, label: "React Router 7", detail: "SPA routing and layouts" },
  { icon: Database, label: "Convex", detail: "Reactive backend and persistence" },
  { icon: ShieldCheck, label: "Convex Auth", detail: "Authentication at the data boundary" },
  { icon: Layers3, label: "shadcn/ui", detail: "Base UI components and CSS variables" },
]

export function HomePage() {
  return (
    <section className="space-y-8">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Framework baseline</p>
        <h1 className="text-4xl font-semibold tracking-tight">Ready for product requirements.</h1>
        <p className="text-pretty text-muted-foreground">
          The application shell, routing, theming, authentication, live backend connection,
          component system, and ephemeral UI store are configured without domain features.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {foundations.map(({ icon: Icon, label, detail }) => (
          <div className="flex items-start gap-3 rounded-xl border bg-card p-4" key={label}>
            <Icon className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <h2 className="font-medium">{label}</h2>
              <p className="text-sm text-muted-foreground">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
