import { useAuthActions } from "@convex-dev/auth/react"
import { useState, type FormEvent } from "react"
import { useLocation, useNavigate } from "react-router"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type AuthFlow = "signIn" | "signUp"

export function SignInPage() {
  const { signIn } = useAuthActions()
  const [flow, setFlow] = useState<AuthFlow>("signIn")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const destination = (location.state as { from?: string } | null)?.from ?? "/protected"

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(event.currentTarget)
      formData.set("flow", flow)
      await signIn("password", formData)
      toast.success(flow === "signUp" ? "Account created" : "Signed in")
      navigate(destination, { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-sm space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {flow === "signIn" ? "Sign in" : "Create an account"}
        </h1>
        <p className="text-sm text-muted-foreground">Authentication is handled by Convex.</p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input autoComplete="email" id="email" name="email" required type="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            autoComplete={flow === "signIn" ? "current-password" : "new-password"}
            id="password"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </div>
        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Please wait…" : flow === "signIn" ? "Sign in" : "Create account"}
        </Button>
      </form>
      <Button
        className="w-full"
        onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
        type="button"
        variant="ghost"
      >
        {flow === "signIn" ? "Need an account? Sign up" : "Already registered? Sign in"}
      </Button>
    </section>
  )
}
