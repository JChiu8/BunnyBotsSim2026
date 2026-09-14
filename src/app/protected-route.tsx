import { useConvexAuth } from "@convex-dev/auth/react"
import { LoaderCircle } from "lucide-react"
import { Navigate, Outlet, useLocation } from "react-router"

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        Checking your session…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/sign-in" />
  }

  return <Outlet />
}
