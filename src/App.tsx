import { createBrowserRouter, RouterProvider } from "react-router"

import { RootLayout } from "@/app/root-layout"
import { ProtectedRoute } from "@/app/protected-route"
import { SetupPage } from "@/routes/setup"
import { SimulatorPage } from "@/routes/simulator"
import { ProtectedPage } from "@/routes/protected"
import { SignInPage } from "@/routes/sign-in"

const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: SetupPage },
      { path: "simulator", Component: SimulatorPage },
      { path: "sign-in", Component: SignInPage },
      {
        Component: ProtectedRoute,
        children: [{ path: "protected", Component: ProtectedPage }],
      },
    ],
  },
], { basename: import.meta.env.BASE_URL })

export default function App() {
  return <RouterProvider router={router} />
}
