import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get("country")?.toUpperCase()

  if (!country) {
    return NextResponse.json({ error: "Country parameter is required" }, { status: 400 })
  }

  let url: string
  if (country === "IN" || country === "IND") {
    url = "https://fapublicdata.blob.core.windows.net/fa-public-data/phaser_out_bar_charts/phaseout_data_IN.json"
  } else {
    url = `https://fapublicdata.blob.core.windows.net/fa-public-data/phaser_out_bar_charts/phaseout_data_${country}.json`
  }

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching phase-out data:", error)
    return NextResponse.json({ error: "Failed to fetch phase-out data" }, { status: 500 })
  }
}

