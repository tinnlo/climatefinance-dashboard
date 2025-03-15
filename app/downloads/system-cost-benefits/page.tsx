import type { Metadata } from "next"
import { DownloadSystemCostBenefits } from "@/components/download-system-cost-benefits"
import { ProtectedRoute } from "@/components/protected-route"

export const metadata: Metadata = {
  title: "Download System Cost Benefits Data",
  description: "Download detailed system cost and benefits data for selected countries",
}

export default function DownloadSystemCostBenefitsPage() {
  return (
    <ProtectedRoute>
      <DownloadSystemCostBenefits />
    </ProtectedRoute>
  )
} 