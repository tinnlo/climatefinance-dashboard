import { COST_COLORS } from "./constants"

export interface CostData {
  years: number[]
  costs: {
    [key: string]: number[]
  }
}

export async function fetchCountryData(country: string): Promise<CostData> {
  const url = `https://fapublicdata.blob.core.windows.net/fa-public-data/cost_by_country/${country}_costs.json`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error(`Error fetching data for ${country}:`, error)
    throw error
  }
}

export function processCostData(data: CostData): CostData {
  // Ensure all cost types from COST_COLORS are present in the data
  const processedCosts: { [key: string]: number[] } = {}

  Object.keys(COST_COLORS).forEach((costType) => {
    processedCosts[costType] = data.costs[costType] || data.years.map(() => 0)
  })

  return {
    years: data.years,
    costs: processedCosts,
  }
}

