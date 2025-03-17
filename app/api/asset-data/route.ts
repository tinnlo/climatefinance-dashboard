import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get("country") || "UGA"
  const scenario = searchParams.get("scenario") || "maturity"
  
  // Construct the URL directly
  const url = `https://fapublicdata.blob.core.windows.net/fa-public-data/asset_info/${country}_${scenario}_asset_info.json`
  
  console.log(`Asset data API called with URL: ${url}`);
  
  try {
    // Fetch the data with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    console.log(`Starting fetch for URL: ${url}`);
    
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
      console.error(`Failed to fetch asset data:`, {
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
      
      // Check if it has an assets property
      if (data && data.assets && Array.isArray(data.assets)) {
        console.log(`Found ${data.assets.length} assets in the 'assets' property`);
        // Return the assets array
        return NextResponse.json(data.assets);
      }
      
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
    console.error("Error in asset data API:", error);
    return NextResponse.json({ 
      error: "Failed to fetch asset data",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 