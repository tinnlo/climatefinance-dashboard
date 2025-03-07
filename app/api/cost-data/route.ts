import { NextResponse } from "next/server"
import { fetchCountryData, processCostData } from "@/lib/process-data"
import { COUNTRY_NAMES } from "@/lib/constants"

export async function GET() {
  const countries = Object.keys(COUNTRY_NAMES)
  const countryData: { [key: string]: any } = {}

  try {
    await Promise.all(
      countries.map(async (country) => {
        try {
          const rawData = await fetchCountryData(country)
          countryData[country] = processCostData(rawData)
        } catch (error) {
          console.error(`Error processing data for ${country}:`, error)
          countryData[country] = null
        }
      }),
    )

    return NextResponse.json({ countries: countryData })
  } catch (error) {
    console.error("Error in GET handler:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}

