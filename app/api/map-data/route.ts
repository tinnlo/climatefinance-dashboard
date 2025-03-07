import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get("country")?.toUpperCase()
  const order = searchParams.get("order") || "maturity"

  if (!country) {
    return NextResponse.json({ error: "Country parameter is required" }, { status: 400 })
  }

  let url: string
  if (country === "IN" || country === "IND") {
    switch (order) {
      case "emission_factor":
        url =
          "https://fapublicdata.blob.core.windows.net/fa-public-data/phase_out_order_maps/IND_emission_factor_data.json"
        break
      case "emissions_per_OC_maturity":
        url =
          "https://fapublicdata.blob.core.windows.net/fa-public-data/phase_out_order_maps/IND_emissions_per_OC_maturity_data.json"
        break
      default:
        url = "https://fapublicdata.blob.core.windows.net/fa-public-data/phase_out_order_maps/IND_maturity_data.json"
    }
  } else {
    url = `https://fapublicdata.blob.core.windows.net/fa-public-data/phase_out_order_maps/${country}_${order}_data.json`
  }

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching map data:", error)
    return NextResponse.json({ error: "Failed to fetch map data" }, { status: 500 })
  }
}

