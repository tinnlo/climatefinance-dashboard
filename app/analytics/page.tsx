"use client"

import { Header } from "@/components/header"
import { LineChart } from "@/components/line-chart"
import { CostChart } from "@/components/cost-chart"
import { DataTable } from "@/components/data-table"
import { useState } from "react"

export default function AnalyticsPage() {
  const [selectedCountry, setSelectedCountry] = useState("in")

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country)
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background/95 to-forest/30">
      <Header selectedCountry={selectedCountry} onCountryChange={handleCountryChange} />
      <main className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-light tracking-tight">Analytics</h2>
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <LineChart className="col-span-4" />
            <CostChart className="col-span-3" country={selectedCountry} />
          </div>

          <DataTable />
        </div>
      </main>
    </div>
  )
}

