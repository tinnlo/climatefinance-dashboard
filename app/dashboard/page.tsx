import type { Metadata } from "next"
import DashboardClientPage from "./DashboardClientPage"
import { ProtectedRoute } from "@/components/protected-route"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Forward Global Institute Dashboard with charts and data visualization",
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardClientPage />
    </ProtectedRoute>
  )
}

