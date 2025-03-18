import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get("country")
  
  if (!country) {
    console.error("Country parameter is required but was not provided");
    return NextResponse.json({ error: "Country parameter is required" }, { status: 400 });
  }
  
  // Construct the URL to fetch company data
  const url = `https://fapublicdata.blob.core.windows.net/fa-public-data/company_info/${country}_company_info.json`
  
  console.log(`Company data API called with URL: ${url}`);
  
  try {
    // Fetch the data with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    console.log(`Starting fetch for company data URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log(`Fetch response status: ${response.status} for URL: ${url}`);
    
    if (!response.ok) {
      console.error(`Failed to fetch company data:`, {
        status: response.status,
        statusText: response.statusText,
        url
      });
      return NextResponse.json({ error: `HTTP error! status: ${response.status}` }, { status: response.status });
    }
    
    // Get the raw text first
    let text = await response.text();
    console.log(`Got response text of length ${text.length}`);
    
    try {
      // Fix invalid JSON: replace NaN with null
      text = text.replace(/: NaN/g, ': null');
      
      // Parse the text as JSON
      const data = JSON.parse(text);
      console.log(`Successfully parsed JSON from text after fixing NaN values`);
      
      // If it's already an array, return it
      if (Array.isArray(data)) {
        console.log(`Data is already an array with ${data.length} items`);
        return NextResponse.json(data);
      }
      
      // Log the structure of the data to help debug
      console.log('Data structure:', Object.keys(data || {}));
      
      // Otherwise, return the data as is
      console.log(`Data is not in expected format, returning as is`);
      return NextResponse.json(data);
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      
      console.log(`Raw response first 200 chars:`, text.substring(0, 200));
      
      return NextResponse.json({ 
        error: "Failed to parse JSON response",
        details: parseError instanceof Error ? parseError.message : "Unknown error",
        responsePreview: text.substring(0, 200)
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in company data API:", error);
    return NextResponse.json({ 
      error: "Failed to fetch company data",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 