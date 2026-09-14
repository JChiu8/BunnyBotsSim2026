import { useAuthActions } from "@convex-dev/auth/react"
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react"
import { Gamepad2, LoaderCircle, LogIn, LogOut } from "lucide-react"
import { Link, NavLink, Outlet } from "react-router"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button, buttonVariants } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

function AccountAction() {
  const { signOut } = useAuthActions()

  return (
    <>
      <AuthLoading>
        <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
      </AuthLoading>
      <Unauthenticated>
        <Link className={buttonVariants({ variant: "outline" })} to="/sign-in">
          <LogIn data-icon="inline-start" />
          Sign in
        </Link>
      </Unauthenticated>
      <Authenticated>
        <Button variant="outline" onClick={() => void signOut()}>
          <LogOut data-icon="inline-start" />
          Sign out
        </Button>
      </Authenticated>
    </>
  )
}

export function RootLayout() {
  return (
    <TooltipProvider>
      <div className="min-h-svh bg-background text-foreground">
        <header className="border-b">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
            <Link className="font-semibold tracking-tight" to="/">
              <Gamepad2 className="mr-2 inline size-4" />BunnyBotsSim2026
            </Link>
            <nav className="ml-auto flex items-center gap-1">
              <NavLink
                className={({ isActive }) =>
                  cn(buttonVariants({ variant: "ghost" }), isActive && "bg-muted")
                }
                to="/"
              >
                Setup
              </NavLink>
              <ThemeToggle />
              <AccountAction />
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6">
          <Outlet />
        </main>
      </div>
      <Toaster richColors position="bottom-right" />
    </TooltipProvider>
  )
}
