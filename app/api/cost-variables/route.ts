import { NextResponse } from "next/server"

// Remove "Total Cost" from the variables since it will be the sum
const COST_VARIABLES = [
  { id: "cost_battery_grid", name: "Grid Battery Cost", baseValue: 0.2 },
  { id: "cost_battery_long", name: "Long-term Battery Cost", baseValue: 0.15 },
  { id: "cost_battery_pe", name: "PE Battery Cost", baseValue: 0.1 },
  { id: "cost_battery_short", name: "Short-term Battery Cost", baseValue: 0.1 },
  { id: "investment_cost", name: "Investment Cost", baseValue: 0.25 },
  { id: "opportunity_cost", name: "Opportunity Cost", baseValue: 0.2 },
]

function generateGrowingCosts(country: string) {
  const years = Array.from({ length: 26 }, (_, i) => 2025 + i)
  const annualGrowthRate = 0.05 // 5% annual growth

  // Use different base multipliers for different countries
  const countryMultiplier =
    country === "us"
      ? 1.5
      : country === "de"
        ? 1.2
        : country === "in"
          ? 0.8
          : country === "id"
            ? 0.7
            : country === "vn"
              ? 0.6
              : country === "tr"
                ? 0.5
                : country === "pl"
                  ? 0.4
                  : country === "kz"
                    ? 0.3
                    : country === "emde"
                      ? 1.0
                      : 1.0

  return years.map((year, index) => {
    const yearData: Record<string, any> = { year }
    const growthFactor = Math.pow(1 + annualGrowthRate, index)

    // Calculate individual costs
    let totalCost = 0
    COST_VARIABLES.forEach((variable) => {
      const baseValue = variable.baseValue * countryMultiplier
      // Add some random variation (±10%) to each component
      const randomFactor = 0.9 + Math.random() * 0.2
      const value = +(baseValue * growthFactor * randomFactor).toFixed(2)
      yearData[variable.id] = value
      totalCost += value
    })

    // Add the total cost separately
    yearData.cost = +totalCost.toFixed(2)

    return yearData
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get("country") || "in"

  try {
    const data = generateGrowingCosts(country)

    return NextResponse.json({
      variables: COST_VARIABLES,
      data: data,
    })
  } catch (error) {
    console.error("Error in cost-variables API:", error)
    return NextResponse.json({ error: "Failed to generate data" }, { status: 500 })
  }
}

