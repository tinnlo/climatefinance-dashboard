import { NextResponse } from "next/server"

// Define type for country codes
type CountryCode = 'IND' | 'IDN' | 'ZAF' | 'VNM' | 'IRN' | 'MEX' | 'NGA' | 'EGY' | 'KEN' | 'TZA' | 'THA' | 'UGA';

// Data endpoints
const AIR_POLLUTION_BENEFITS_URL = "https://fapublicdata.blob.core.windows.net/fa-public-data/cost_benefit/discounted_benefit_35_50.json"
const COUNTRY_BENEFITS_URL = "https://fapublicdata.blob.core.windows.net/fa-public-data/cost_benefit/country_cost_35_50.json"
const GLOBAL_BENEFITS_URL = "https://fapublicdata.blob.core.windows.net/fa-public-data/cost_benefit/global_cost_35_50.json"
const COUNTRY_INFO_URL = "https://fapublicdata.blob.core.windows.net/fa-public-data/country_info/country_info_list.json"
const TOTAL_COST_URL = "https://fapublicdata.blob.core.windows.net/fa-public-data/cost_benefit/total_cost_35_50.json"

// Simpler function to fetch data
async function fetchData(url: string) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    
    const responseText = await response.text();
    
    // Handle PowerShell errors if present
    const jsonStartIndex = responseText.indexOf('{');
    let cleanedText = responseText;
    
    if (jsonStartIndex > 0) {
      console.log(`Found JSON starting at position ${jsonStartIndex}, cleaning response`);
      cleanedText = responseText.substring(jsonStartIndex);
    }
    
    // Parse and return the JSON
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get("country")
    const scc = searchParams.get("scc")
    const timeHorizon = searchParams.get("timeHorizon")

    console.log("Request parameters:", { country, scc, timeHorizon })

    // Fetch all data in parallel
    const [airPollutionBenefits, countryBenefits, globalBenefits, countryInfoResponse, totalCostResponse] = await Promise.all([
      fetch(AIR_POLLUTION_BENEFITS_URL).catch(err => {
        console.error("Error fetching air pollution benefits:", err);
        return null;
      }),
      fetch(COUNTRY_BENEFITS_URL).catch(err => {
        console.error("Error fetching country benefits:", err);
        return null;
      }),
      fetch(GLOBAL_BENEFITS_URL).catch(err => {
        console.error("Error fetching global benefits:", err);
        return null;
      }),
      fetch(COUNTRY_INFO_URL).catch(err => {
        console.error("Error fetching country info:", err);
        return null;
      }),
      fetch(TOTAL_COST_URL).catch(err => {
        console.error("Error fetching total cost data:", err);
        return null;
      })
    ])

    // Check if all fetches failed
    if (!airPollutionBenefits && !countryBenefits && !globalBenefits && !countryInfoResponse && !totalCostResponse) {
      throw new Error("All data fetches failed")
    }

    // Initialize data objects with proper types
    let airPollutionData: Record<string, Record<string, string>> = {}
    let countryBenefitsData: Record<string, Record<string, Record<string, string>>> = {}
    let globalBenefitsData: Record<string, Record<string, Record<string, string>>> = {}
    let countryInfoData: Array<Record<string, any>> = []
    let totalCostData: Record<string, any> = {}

    // Process responses
    if (airPollutionBenefits) {
      airPollutionData = await airPollutionBenefits.json()
    }
    if (countryBenefits) {
      countryBenefitsData = await countryBenefits.json()
    }
    if (globalBenefits) {
      globalBenefitsData = await globalBenefits.json()
    }
    if (countryInfoResponse) {
      countryInfoData = await countryInfoResponse.json()
    }
    if (totalCostResponse) {
      totalCostData = await totalCostResponse.json()
    }

    // Get time key based on timeHorizon
    const timeKey = timeHorizon === "2035" ? "2024-2035" : "2024-2050"

    // Get cost data for the country
    const countryCostData = country ? totalCostData[country] || {} : {}
    const opportunityCost = parseFloat(countryCostData["Opportunity costs (in trillion dollars)"]?.[timeKey] || "0")
    const investmentCost = parseFloat(countryCostData["Investment costs (in trillion dollars)"]?.[timeKey] || "0")
    const gdpOverTime = parseFloat(countryCostData["GDP over time period (in trillion dollars)"]?.[timeKey] || "0")

    // Calculate total cost
    const totalCost = opportunityCost + investmentCost

    // Create costs data for the donut chart
    const costs = [
      { 
        name: "Opportunity Costs", 
        value: opportunityCost,
        color: "#ff7c43" 
      },
      { 
        name: "Investment Costs", 
        value: investmentCost,
        color: "#ffa600" 
      }
    ]

    // Log cost data for debugging
    console.log("Cost data:", {
      country,
      timeKey,
      opportunityCost,
      investmentCost,
      totalCost,
      gdpOverTime
    })

    // Get country info and GDP data
    const countryInfo = countryInfoData.find((c: any) => c.Country_ISO3 === country) || {}
    console.log("Country info from SharePoint:", countryInfo)

    // Get GDP in trillions USD (convert from current USD)
    const gdpInTrillions = countryInfo.GDP_2023 ? countryInfo.GDP_2023 / 1e12 : 0
    console.log("GDP in trillions USD:", gdpInTrillions)

    // Log country info for debugging
    console.log('Country Info:', {
      country: country,
      gdp: gdpInTrillions,
      gdpRaw: countryInfo.GDP_2023,
      name: countryInfo.Country || country
    });

    console.log("Data fetched successfully. Processing values...");
    
    // 1. Process air pollution benefits
    let airPollutionBenefit = 0;
    if (country && airPollutionData[country]?.[timeHorizon || '']) {
      const rawValue = airPollutionData[country][timeHorizon || ''];
      console.log(`Raw Air Pollution Benefit value: "${rawValue}" (${typeof rawValue})`);
      airPollutionBenefit = parseFloat(rawValue);
      console.log(`Parsed Air Pollution Benefit: ${airPollutionBenefit}`);
    } else {
      console.log(`No Air Pollution data for ${country} at ${timeHorizon}`);
    }
    
    // 2. Process country benefits
    let countryBenefit = 0;
    const countrySccKey = `scc ${scc} CC benefit (in trillion dollars)`;
    
    if (country && countryBenefitsData[country]?.[countrySccKey]?.[timeKey]) {
      const rawValue = countryBenefitsData[country][countrySccKey][timeKey];
      console.log(`Raw Country Benefit value: "${rawValue}" (${typeof rawValue})`);
      countryBenefit = parseFloat(rawValue);
      console.log(`Parsed Country Benefit: ${countryBenefit}`);
    } else {
      console.log(`No Country Benefit data for ${country}, SCC ${scc}, time ${timeKey}`);
    }
    
    // 3. Process global benefits
    let worldBenefit = 0;
    const globalSccKey = `scc ${scc} GC benefit (in trillion dollars)`;
    
    if (country && globalBenefitsData[country]?.[globalSccKey]?.[timeKey]) {
      const rawValue = globalBenefitsData[country][globalSccKey][timeKey];
      console.log(`Raw Global Benefit value: "${rawValue}" (${typeof rawValue})`);
      worldBenefit = parseFloat(rawValue);
      console.log(`Parsed Global Benefit: ${worldBenefit}`);
    } else {
      console.log(`No Global Benefit data for ${country}, SCC ${scc}, time ${timeKey}`);
    }
    
    // Calculate the total benefit
    const totalBenefit = airPollutionBenefit + countryBenefit + worldBenefit;
    
    // Log the final values
    console.log("Final benefit values:");
    console.log(`- Air Pollution Benefit: ${airPollutionBenefit}`);
    console.log(`- Country Benefit: ${countryBenefit}`);
    console.log(`- World Benefit: ${worldBenefit}`);
    console.log(`- Total Benefit: ${totalBenefit}`);

    // Calculate GDP percentages using GDP from total cost data
    const costGdpPercentage = Number((totalCost / gdpOverTime * 100).toFixed(1));
    const benefitGdpPercentage = totalBenefit > 0 ? Number((totalBenefit / gdpOverTime * 100).toFixed(1)) : 0;
    
    // Log final values
    console.log('GDP calculations:', {
      gdpOverTime,
      costGdpPercentage,
      benefitGdpPercentage,
      totalCost,
      totalBenefit
    });
    
    // Construct the response data
    const responseData = {
      costs,
      totalCost,
      costGdpPercentage,
      airPollutionBenefit,
      countryBenefit,
      worldBenefit,
      totalBenefit,
      benefitGdpPercentage,
    };
    
    console.log('Response Data:', JSON.stringify(responseData, null, 2));
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error in system-cost-benefits API:", error);
    return NextResponse.json({ 
      error: "Failed to fetch data", 
      errorMessage: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

