import { NextResponse } from "next/server"
import { convertToIso3 } from "@/lib/utils"

export async function GET(request: Request) {
  try {
    // Get country code from URL
    const { searchParams } = new URL(request.url)
    const countryCode = searchParams.get('country') || 'in'
    const iso3Code = convertToIso3(countryCode)

    const response = await fetch(
      "https://fapublicdata.blob.core.windows.net/fa-public-data/country_info/country_info_list.json",
      {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      }
    )
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const allCountryData = await response.json()
    
    // Find the specific country data
    let countryData = allCountryData.find((c: any) => c.Country_ISO3 === iso3Code)
    
    if (!countryData) {
      return NextResponse.json({ error: "Country not found" }, { status: 404 })
    }

    // If Asset_Amount_operating is a regular number and not an object with technology breakdown
    // Convert it to maintain backward compatibility
    if (countryData.Asset_Amount_operating && typeof countryData.Asset_Amount_operating === 'number') {
      countryData.Asset_Amount_operating = {
        total_assets: countryData.Asset_Amount_operating,
        technologies: []
      };
    }

    // Transform the data to handle sectors properly
    if (countryData) {
      // If we have a single Sector field but no Sectors array
      if (countryData.Sector && !countryData.Sectors) {
        // Create a Sectors array with just the one sector
        countryData = {
          ...countryData,
          Sectors: [countryData.Sector],
          SectorData: {
            "all": {
              Asset_Amount_operating: countryData.Asset_Amount_operating,
              Asset_Amount_planned: countryData.Asset_Amount_planned,
              Capacity_operating: countryData.Capacity_operating,
              Capacity_planned: countryData.Capacity_planned,
              Emissions_operating: countryData.Emissions_operating,
              Emissions_planned: countryData.Emissions_planned
            },
            [countryData.Sector]: {
              Asset_Amount_operating: countryData.Asset_Amount_operating,
              Asset_Amount_planned: countryData.Asset_Amount_planned,
              Capacity_operating: countryData.Capacity_operating,
              Capacity_planned: countryData.Capacity_planned,
              Emissions_operating: countryData.Emissions_operating,
              Emissions_planned: countryData.Emissions_planned
            }
          }
        }
      }
      // If we already have a Sectors array but no SectorData
      else if (countryData.Sectors && !countryData.SectorData) {
        const sectorData: {
          [key: string]: {
            Asset_Amount_operating?: any;
            Asset_Amount_planned?: number;
            Capacity_operating?: number;
            Capacity_planned?: number;
            Emissions_operating?: number;
            Emissions_planned?: number;
          }
        } = {
          "all": {
            Asset_Amount_operating: countryData.Asset_Amount_operating,
            Asset_Amount_planned: countryData.Asset_Amount_planned,
            Capacity_operating: countryData.Capacity_operating,
            Capacity_planned: countryData.Capacity_planned,
            Emissions_operating: countryData.Emissions_operating,
            Emissions_planned: countryData.Emissions_planned
          }
        }
        
        // Add data for each sector (using the same data for now)
        // In a real implementation, this would come from the API
        countryData.Sectors.forEach((sector: string) => {
          sectorData[sector] = {
            Asset_Amount_operating: countryData.Asset_Amount_operating,
            Asset_Amount_planned: countryData.Asset_Amount_planned,
            Capacity_operating: countryData.Capacity_operating,
            Capacity_planned: countryData.Capacity_planned,
            Emissions_operating: countryData.Emissions_operating,
            Emissions_planned: countryData.Emissions_planned
          }
        })
        
        countryData = {
          ...countryData,
          SectorData: sectorData
        }
      }
    }
    
    return NextResponse.json(countryData, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Error fetching country info:', error)
    return NextResponse.json({ error: "Failed to fetch country info" }, { status: 500 })
  }
} 