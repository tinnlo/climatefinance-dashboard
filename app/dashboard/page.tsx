import type { Metadata } from "next"
import DashboardClientPage from "./DashboardClientPage"
import { SearchParamsProvider } from "../components/SearchParamsProvider"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Forward Global Institute Dashboard with charts and data visualization",
}

export default function DashboardPage() {
  return (
    <SearchParamsProvider>
      <DashboardClientPage />
    </SearchParamsProvider>
  )
}

