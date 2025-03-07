import { NextResponse } from "next/server"

// Define cost and benefit data based on the Python code
const DUMMY_DATA = {
  costs: [
    { name: "Private Funding", value: 0.3 * 3.5, color: "#ff7c43" },
    { name: "Public Funding", value: 0.4 * 3.5, color: "#ffa600" },
    { name: "International Climate Finance Needs", value: 0.3 * 3.5, color: "#ff9e6d" },
  ],
  benefits: [
    { name: "Economic Impacts from Reduced Air Pollution", value: 0.25 * 6.1, color: "#00b4d8" },
    { name: "Reduced Physical Climate Damage", value: 0.75 * 6.1, color: "#0096c7" },
  ],
  totalCost: 3.5,
  totalBenefit: 6.1,
  costGdpPercentage: 2.5, // Dummy data
  benefitGdpPercentage: 4.3, // Dummy data
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get("country") || "in"

  try {
    // For now, we're returning the same data for all countries
    // In the future, this is where you'd fetch country-specific data
    return NextResponse.json(DUMMY_DATA)
  } catch (error) {
    console.error("Error in system-cost-benefits API:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}

