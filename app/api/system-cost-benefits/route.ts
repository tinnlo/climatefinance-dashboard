import { NextResponse } from "next/server"

// Define cost and benefit data based on the Python code
const DUMMY_COST_DATA = {
  costs: [
    { name: "Private Funding", value: 0.3 * 3.5, color: "#ff7c43" },
    { name: "Public Funding", value: 0.4 * 3.5, color: "#ffa600" },
    { name: "International Climate Finance Needs", value: 0.3 * 3.5, color: "#ff9e6d" },
  ],
  totalCost: 3.5,
  costGdpPercentage: 2.5, // Dummy data
}

// Data endpoints
const AIR_POLLUTION_BENEFITS_URL = "https://fapublicdata.blob.core.windows.net/fa-public-data/cost_benefit/discounted_benefit_35_50.json"
const COUNTRY_BENEFITS_URL = "https://fapublicdata.blob.core.windows.net/fa-public-data/cost_benefit/country_cost_35_50.json"
const GLOBAL_BENEFITS_URL = "https://fapublicdata.blob.core.windows.net/fa-public-data/cost_benefit/global_cost_35_50.json"

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
  const { searchParams } = new URL(request.url)
  const country = searchParams.get("country") || "IND"
  const scc = searchParams.get("scc") || "80"
  const timeHorizon = searchParams.get("timeHorizon") || "2035"
  
  console.log(`Request parameters: country=${country}, scc=${scc}, timeHorizon=${timeHorizon}`);
  
  try {
    // Fetch all three data sources
    console.log("Fetching data from SharePoint URLs...");
    
    const airPollutionData = await fetchData(AIR_POLLUTION_BENEFITS_URL);
    const countryBenefitsData = await fetchData(COUNTRY_BENEFITS_URL);
    const globalBenefitsData = await fetchData(GLOBAL_BENEFITS_URL);
    
    console.log("Data fetched successfully. Processing values...");
    
    // 1. Process air pollution benefits
    let airPollutionBenefit = 0;
    if (airPollutionData && airPollutionData[country] && airPollutionData[country][timeHorizon]) {
      const rawValue = airPollutionData[country][timeHorizon];
      console.log(`Raw Air Pollution Benefit value: "${rawValue}" (${typeof rawValue})`);
      airPollutionBenefit = parseFloat(rawValue);
      console.log(`Parsed Air Pollution Benefit: ${airPollutionBenefit}`);
    } else {
      console.log(`No Air Pollution data for ${country} at ${timeHorizon}`);
    }
    
    // 2. Process country benefits
    let countryBenefit = 0;
    const timeKey = timeHorizon === "2035" ? "2024-2035" : "2024-2050";
    const countrySccKey = `scc ${scc} CC benefit (in trillion dollars)`;
    
    if (countryBenefitsData && countryBenefitsData[country] && 
        countryBenefitsData[country][countrySccKey] && 
        countryBenefitsData[country][countrySccKey][timeKey]) {
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
    
    if (globalBenefitsData && globalBenefitsData[country] && 
        globalBenefitsData[country][globalSccKey] && 
        globalBenefitsData[country][globalSccKey][timeKey]) {
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
    
    // Use dummy cost data
    const { costs, totalCost, costGdpPercentage } = DUMMY_COST_DATA;
    
    // Calculate benefit GDP percentage with more precision for small values
    let benefitGdpPercentage;
    if (totalBenefit > 0) {
      // Scale the percentage based on the ratio of benefit to cost
      const rawPercentage = (totalBenefit / totalCost) * costGdpPercentage;
      
      if (rawPercentage >= 1) {
        // For larger percentages, show one decimal place
        benefitGdpPercentage = rawPercentage.toFixed(1);
      } else if (rawPercentage >= 0.1) {
        // For medium percentages, show two decimal places
        benefitGdpPercentage = rawPercentage.toFixed(2);
      } else {
        // For very small percentages, show more decimal places
        benefitGdpPercentage = rawPercentage.toFixed(3);
      }
    } else {
      benefitGdpPercentage = "0.0";
    }
    
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

