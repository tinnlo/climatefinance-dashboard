import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get("country")?.toLowerCase()

  if (!country) {
    return NextResponse.json({ error: "Country parameter is required" }, { status: 400 })
  }

  const url = `https://fapublicdata.blob.core.windows.net/fa-public-data/phase_out_pipeline/${country}_pipeline_data.json`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching phase-out pipeline data:", error)
    return NextResponse.json({ error: "Failed to fetch phase-out pipeline data" }, { status: 500 })
  }
}

