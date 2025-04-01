"use client"

import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import * as d3 from "d3"
import { feature } from "topojson-client"
import { TimelineSlider } from "./timeline-slider"
import { Button } from "@/components/ui/button"
import { GradientButton } from "@/components/ui/gradient-button"
import { Home, Info } from "lucide-react"
import { useTheme } from "next-themes"
import { convertToIso3, iso2ToIso3Map } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson'
import { Topology, GeometryObject } from 'topojson-specification'
import { Card } from "@/components/ui/card"
import Link from "next/link"

const FIGURE_NOTES = "This map visualizes the phase-out schedules for power plants across different countries. The visualization shows the geographical distribution of power plants, their fuel types (coal, gas, or oil), and their planned phase-out years. The size of each marker is proportional to the plant's emissions, while the color indicates the phase-out year. Use the timeline slider below to see which plants are scheduled for phase-out by a specific year. The map includes state/province boundaries and major cities for better geographical context."

const COMPANY_STATS_NOTES = "This panel presents key statistics about power companies and their assets in the selected country. The summary includes the total number of power plants, total companies operating them, cumulative emissions, and average phase-out year across all plants. The fuel type distribution shows how plants are distributed across coal, gas, and oil. When available, company status information displays the operational status breakdown of companies. The table at the bottom shows the top companies by emissions with their status and capacity information."

interface CountryData {
  Country_ISO3: string
  Country: string
  Asset_Amount?: number
  Firm_Amount?: number
  Emissions_Coverage?: number
}

interface CompanyData {
  Company_Name: string
  Country_ISO3: string
  Status: string
  Capacity_Unit: string
  Emissions_Unit: string
  Capacity: number
  Emissions: number
}

interface MapData {
  name: string
  latitude: number
  longitude: number
  fuel_type: string
  phase_out_year: number
  emissions: number
  uniqueId: string
}

interface CompanyStats {
  totalPlants: number
  totalCompanies: number
  totalEmissions: number
  fuelTypeBreakdown: {
    Coal: number
    Gas: number
    Oil: number
  }
  averagePhaseOutYear: number
}

interface PhaseOutMapProps {
  data: MapData[]
  country?: string
}

// Country names mapping
const COUNTRY_NAMES: { [key: string]: string } = {
  'eg': 'Egypt',
  'id': 'Indonesia',
  'in': 'India',
  'ir': 'Iran',
  'ke': 'Kenya',
  'mx': 'Mexico',
  'ng': 'Nigeria',
  'th': 'Thailand',
  'tz': 'Tanzania',
  'ug': 'Uganda',
  'vn': 'Vietnam',
  'za': 'South Africa'
}

// Add major cities data
const MAJOR_CITIES = {
  "in": [ // India
    { name: "New Delhi", lat: 28.6139, lon: 77.2090 },
    { name: "Mumbai", lat: 19.0760, lon: 72.8777 },
    { name: "Kolkata", lat: 22.5726, lon: 88.3639 },
    { name: "Chennai", lat: 13.0827, lon: 80.2707 },
    { name: "Bangalore", lat: 12.9716, lon: 77.5946 },
    { name: "Hyderabad", lat: 17.3850, lon: 78.4867 },
    { name: "Ahmedabad", lat: 23.0225, lon: 72.5714 },
    { name: "Pune", lat: 18.5204, lon: 73.8567 },
    { name: "Surat", lat: 21.1702, lon: 72.8311 },
    { name: "Lucknow", lat: 26.8467, lon: 80.9462 }
  ],
  "id": [ // Indonesia
    { name: "Jakarta", lat: -6.2088, lon: 106.8456 },
    { name: "Surabaya", lat: -7.2575, lon: 112.7521 },
    { name: "Bandung", lat: -6.9175, lon: 107.6191 },
    { name: "Medan", lat: 3.5952, lon: 98.6722 },
    { name: "Makassar", lat: -5.1477, lon: 119.4327 },
    { name: "Semarang", lat: -6.9932, lon: 110.4203 },
    { name: "Palembang", lat: -2.9761, lon: 104.7754 },
    { name: "Tangerang", lat: -6.1781, lon: 106.6300 }
  ],
  "vn": [ // Vietnam
    { name: "Hanoi", lat: 21.0285, lon: 105.8542 },
    { name: "Ho Chi Minh City", lat: 10.8231, lon: 106.6297 },
    { name: "Da Nang", lat: 16.0544, lon: 108.2022 },
    { name: "Hai Phong", lat: 20.8449, lon: 106.6881 },
    { name: "Can Tho", lat: 10.0452, lon: 105.7469 },
    { name: "Bien Hoa", lat: 10.9508, lon: 106.8221 },
    { name: "Nha Trang", lat: 12.2388, lon: 109.1967 }
  ],
  "th": [ // Thailand
    { name: "Bangkok", lat: 13.7563, lon: 100.5018 },
    { name: "Chiang Mai", lat: 18.7883, lon: 98.9853 },
    { name: "Phuket", lat: 7.9519, lon: 98.3381 },
    { name: "Nonthaburi", lat: 13.8622, lon: 100.5134 },
    { name: "Hat Yai", lat: 7.0086, lon: 100.4747 },
    { name: "Korat", lat: 14.9798, lon: 102.0978 },
    { name: "Udon Thani", lat: 17.4139, lon: 102.7867 }
  ],
  "za": [ // South Africa
    { name: "Johannesburg", lat: -26.2041, lon: 28.0473 },
    { name: "Cape Town", lat: -33.9249, lon: 18.4241 },
    { name: "Durban", lat: -29.8587, lon: 31.0218 },
    { name: "Pretoria", lat: -25.7461, lon: 28.1881 },
    { name: "Port Elizabeth", lat: -33.9608, lon: 25.6022 },
    { name: "Bloemfontein", lat: -29.0852, lon: 26.1596 },
    { name: "East London", lat: -33.0292, lon: 27.8546 }
  ],
  "eg": [ // Egypt
    { name: "Cairo", lat: 30.0444, lon: 31.2357 },
    { name: "Alexandria", lat: 31.2001, lon: 29.9187 },
    { name: "Giza", lat: 30.0131, lon: 31.2089 },
    { name: "Shubra", lat: 30.0982, lon: 31.2428 },
    { name: "Luxor", lat: 25.6872, lon: 32.6396 },
    { name: "Aswan", lat: 24.0889, lon: 32.8998 },
    { name: "Port Said", lat: 31.2567, lon: 32.2840 }
  ],
  "ir": [ // Iran
    { name: "Tehran", lat: 35.6892, lon: 51.3890 },
    { name: "Mashhad", lat: 36.2605, lon: 59.6168 },
    { name: "Isfahan", lat: 32.6546, lon: 51.6680 },
    { name: "Karaj", lat: 35.8400, lon: 50.9391 },
    { name: "Tabriz", lat: 38.0800, lon: 46.2919 },
    { name: "Shiraz", lat: 29.5917, lon: 52.5836 }
  ],
  "ke": [ // Kenya
    { name: "Nairobi", lat: -1.2921, lon: 36.8219 },
    { name: "Mombasa", lat: -4.0435, lon: 39.6682 },
    { name: "Kisumu", lat: -0.1022, lon: 34.7617 },
    { name: "Nakuru", lat: -0.3031, lon: 36.0800 },
    { name: "Eldoret", lat: 0.5143, lon: 35.2698 }
  ],
  "mx": [ // Mexico
    { name: "Mexico City", lat: 19.4326, lon: -99.1332 },
    { name: "Guadalajara", lat: 20.6597, lon: -103.3496 },
    { name: "Monterrey", lat: 25.6866, lon: -100.3161 },
    { name: "Puebla", lat: 19.0413, lon: -98.2062 },
    { name: "Tijuana", lat: 32.5149, lon: -117.0382 },
    { name: "León", lat: 21.1219, lon: -101.6833 }
  ],
  "ng": [ // Nigeria
    { name: "Lagos", lat: 6.5244, lon: 3.3792 },
    { name: "Kano", lat: 12.0022, lon: 8.5920 },
    { name: "Ibadan", lat: 7.3775, lon: 3.9470 },
    { name: "Abuja", lat: 9.0765, lon: 7.3986 },
    { name: "Port Harcourt", lat: 4.8156, lon: 7.0498 },
    { name: "Benin City", lat: 6.3350, lon: 5.6037 }
  ],
  "tz": [ // Tanzania
    { name: "Dar es Salaam", lat: -6.7924, lon: 39.2083 },
    { name: "Mwanza", lat: -2.5167, lon: 32.9000 },
    { name: "Arusha", lat: -3.3667, lon: 36.6833 },
    { name: "Dodoma", lat: -6.1722, lon: 35.7395 },
    { name: "Zanzibar City", lat: -6.1659, lon: 39.2026 }
  ],
  "ug": [ // Uganda
    { name: "Kampala", lat: 0.3476, lon: 32.5825 },
    { name: "Gulu", lat: 2.7747, lon: 32.2990 },
    { name: "Lira", lat: 2.2499, lon: 32.8999 },
    { name: "Mbarara", lat: -0.6067, lon: 30.6556 },
    { name: "Jinja", lat: 0.4250, lon: 33.2039 }
  ]
}

// Define reliable sources for state/province boundaries
const STATE_BOUNDARY_SOURCES = {
  // Natural Earth Data (10m admin 1 states provinces)
  naturalEarth: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson",
  
  // Country-specific sources from geoBoundaries
  geoBoundaries: {
    base: "https://www.geoboundaries.org/api/current/gbOpen/",
    format: "/simplifiedGeoBoundaries.geojson"
  },
  
  // Country-specific sources from deldersveld/topojson
  deldersveld: {
    'in': 'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/india/india-states.json',
    'id': 'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/indonesia/indonesia-provinces.json',
    'za': 'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/south-africa/south-africa-provinces.json',
    'th': 'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/thailand/thailand-provinces.json',
    'vn': 'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/vietnam/vietnam-provinces.json',
    'mx': 'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/mexico/mexico-states.json',
    'ng': 'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/nigeria/nigeria-states.json',
    'eg': 'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/egypt/egypt-governorates.json',
    'ir': 'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/iran/iran-provinces.json',
    'ke': 'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/kenya/kenya-counties.json',
    'tz': 'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/tanzania/tanzania-regions.json',
    'ug': 'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/uganda/uganda-districts.json'
  }
}

export function PhaseOutMap({ data, country = "in" }: PhaseOutMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentYear, setCurrentYear] = useState(2025)
  const [mapInitialized, setMapInitialized] = useState(false)
  const [countryData, setCountryData] = useState<CountryData | null>(null)
  const [companyData, setCompanyData] = useState<CompanyData[]>([])
  const [isLoadingCompanyData, setIsLoadingCompanyData] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 })
  const initialTransformRef = useRef<d3.ZoomTransform | null>(null)
  const zoomRef = useRef<any>(null)
  const { theme, systemTheme } = useTheme()

  // Fetch country data
  useEffect(() => {
    const fetchCountryData = async () => {
      try {
        const iso3Code = convertToIso3(country)
        const response = await fetch('/api/country-info')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const allCountryData = await response.json()
        const countryInfo = allCountryData.find((c: CountryData) => c.Country_ISO3 === iso3Code)
        setCountryData(countryInfo || null)
      } catch (error) {
        console.error('Error fetching country data:', error)
      }
    }

    fetchCountryData()
  }, [country])

  // Fetch company data
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        setIsLoadingCompanyData(true)
        const iso3Code = convertToIso3(country)
        const response = await fetch(`/api/company-data?country=${iso3Code}`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (Array.isArray(data)) {
          setCompanyData(data)
          console.log(`Loaded ${data.length} companies for ${iso3Code}`)
        } else {
          console.error('Company data is not an array:', data)
          setCompanyData([])
        }
      } catch (error) {
        console.error('Error fetching company data:', error)
        setCompanyData([])
      } finally {
        setIsLoadingCompanyData(false)
      }
    }

    fetchCompanyData()
  }, [country])

  // Filter out points with invalid coordinates
  const validData = useMemo(() => 
    data?.filter(d => !isNaN(d.latitude) && !isNaN(d.longitude)) || [], 
    [data]
  )

  const invalidDataCount = useMemo(() => 
    data ? data.length - validData.length : 0,
    [data, validData]
  )

  // Add debug logging for data
  console.log('Phase-out Map Debug:', {
    totalDataPoints: data?.length || 0,
    validDataPoints: validData.length,
    invalidDataPoints: invalidDataCount,
    firstPoint: data?.[0] || null,
    uniqueYears: validData ? Array.from(new Set(validData.map(d => d.phase_out_year))).sort() : [],
    uniqueFuelTypes: validData ? Array.from(new Set(validData.map(d => d.fuel_type))).sort() : [],
    boundingBox: validData.length > 0 ? {
      lat: {
        min: Math.min(...validData.map(d => d.latitude)),
        max: Math.max(...validData.map(d => d.latitude))
      },
      lon: {
        min: Math.min(...validData.map(d => d.longitude)),
        max: Math.max(...validData.map(d => d.longitude))
      }
    } : null
  })

  // Reset map when data changes
  useEffect(() => {
    setMapInitialized(false)
  }, [data])

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const containerHeight = entry.contentRect.height;
          setDimensions({
            width: entry.contentRect.width,
            height: containerHeight, // Use the full container height
          })
        }
      })

      resizeObserver.observe(containerRef.current)
      return () => {
        resizeObserver.disconnect()
        if (svgRef.current) {
          d3.select(svgRef.current).selectAll("*").remove()
        }
      }
    }
  }, [])

  const margin = { top: 20, right: 30, bottom: 60, left: 40 }

  // Get the actual theme considering system preference
  const currentTheme = theme === "system" ? systemTheme : theme

  // Define color variables for light and dark modes
  const colors = useMemo(
    () => ({
      background: currentTheme === "dark" ? "#121212" : "#ffffff",
      land: currentTheme === "dark" ? "#2F3A2F" : "#e6efe6",
      border: currentTheme === "dark" ? "#3F4F3F" : "#c2d6c2",
      stateBorder: currentTheme === "dark" ? "#4F5F4F" : "#a2b6a2",
      text: currentTheme === "dark" ? "#ffffff" : "#000000",
      cityLabel: currentTheme === "dark" ? "#ffffff" : "#000000",
      cityMarker: currentTheme === "dark" ? "#ffffff" : "#ffffff", // Changed back to white as requested
      controls: currentTheme === "dark" ? "#2F3A2F" : "#e6efe6",
      legendFill: currentTheme === "dark" ? "#1e1e1e" : "#ffffff",
      legendStroke: currentTheme === "dark" ? "#3F4F3F" : "#c2d6c2",
      coal: currentTheme === "dark" ? "#0194C5" : "#0194C5", // Brighter blue
      gas: currentTheme === "dark" ? "#319B9D" : "#319B9D", // Teal
      oil: currentTheme === "dark" ? "#e9c46a" : "#e9c46a", // Yellow
    }),
    [currentTheme],
  )

  const projection = useMemo(() => {
    if (!validData || !validData.length) return null

    const padding = 0.2 // Padding as a percentage of the data bounds
    
    // Calculate bounds from the data
    const bounds = [
      [
        d3.min(validData, (d) => d.longitude) || 0,
        d3.min(validData, (d) => d.latitude) || 0,
      ],
      [
        d3.max(validData, (d) => d.longitude) || 0,
        d3.max(validData, (d) => d.latitude) || 0,
      ],
    ]
    
    // Apply padding to bounds
    const longitudeRange = bounds[1][0] - bounds[0][0]
    const latitudeRange = bounds[1][1] - bounds[0][1]
    
    const adjustedBounds = [
      [bounds[0][0] - longitudeRange * padding, bounds[0][1] - latitudeRange * padding],
      [bounds[1][0] + longitudeRange * padding, bounds[1][1] + latitudeRange * padding]
    ]

    return d3.geoMercator().fitExtent(
      [
        [margin.left, margin.top],
        [dimensions.width - margin.right, dimensions.height - margin.bottom],
      ],
      {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [adjustedBounds[0][0], adjustedBounds[0][1]],
                  [adjustedBounds[0][0], adjustedBounds[1][1]],
                  [adjustedBounds[1][0], adjustedBounds[1][1]],
                  [adjustedBounds[1][0], adjustedBounds[0][1]],
                  [adjustedBounds[0][0], adjustedBounds[0][1]],
                ],
              ],
            },
            properties: {},
          },
        ],
      }
    )
  }, [validData, dimensions, margin])

  const colorScale = useMemo(
    () => d3.scaleSequential().domain([2025, 2050]).interpolator(d3.interpolate("#ffeda0", "#bd0026")),
    [],
  )

  const sizeScale = useMemo(
    () =>
      d3
        .scaleSqrt()
        .domain([0, d3.max(validData, (d: any) => d.emissions) || 0])
        .range([0.5, 2.5]),
    [validData],
  )

  const getSymbol = useCallback((fuelType: string) => {
    switch (fuelType.toLowerCase()) {
      case "coal":
        return d3.symbolCircle
      case "oil":
        return d3.symbolSquare
      case "gas":
        return d3.symbolTriangle
      default:
        return d3.symbolCircle
    }
  }, [])

  const getFuelColor = useCallback((fuelType: string) => {
    switch (fuelType.toLowerCase()) {
      case "coal":
        return colors.coal
      case "oil":
        return colors.oil
      case "gas":
        return colors.gas
      default:
        return "#aaaaaa"
    }
  }, [colors])

  const updatePoints = useCallback(() => {
    if (!svgRef.current || !projection) return

    const svg = d3.select(svgRef.current)
    const pointsGroup = svg.select(".points-group")

    // Remove any existing tooltips before creating a new one
    d3.select("body").selectAll(".map-tooltip").remove()

    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "map-tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", currentTheme === "dark" ? "rgba(31, 41, 55, 0.95)" : "rgba(255, 255, 255, 0.95)")
      .style("color", colors.text)
      .style("border", `1px solid ${currentTheme === "dark" ? "#374151" : "#e5e7eb"}`)
      .style("border-radius", "6px")
      .style("padding", "12px")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
      .style("z-index", "1000")
      .style("pointer-events", "none")
      .style("font-size", "14px")

    pointsGroup
      .selectAll(".plant-point")
      .data(validData, (d: any) => d.uniqueId)
      .join(
        (enter: any) =>
          enter
            .append("path")
            .attr("class", "plant-point")
            .attr("d", (d: any) => {
              const symbol = d3
                .symbol()
                .type(getSymbol(d.fuel_type))
                .size(sizeScale(d.emissions) * 40) // Increased from 25 for better visibility
              return symbol()
            })
            .attr("transform", (d: any) => {
              const coords = projection([d.longitude, d.latitude])
              return coords ? `translate(${coords[0]},${coords[1]})` : null
            })
            .attr("fill", (d: any) => colorScale(d.phase_out_year))
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 0.8) // Increased from 0.5
            .attr("opacity", 0.8),
        (update: any) => update,
      )
      .attr("visibility", (d: any) => (d.phase_out_year <= currentYear ? "visible" : "hidden"))
      .on("mouseover", (event: any, d: any) => {
        d3.select(event.currentTarget).attr("opacity", 1).attr("stroke", colors.border).attr("stroke-width", 2.5) // Increased from 2
        tooltip.transition().duration(200).style("opacity", 0.9)
        tooltip
          .html(
            `<div>
              <div style="font-weight: 500; margin-bottom: 4px; color: ${colors.text}">
                ${d.name}
              </div>
              <div style="opacity: 0.9; color: ${colors.text}">
                Emissions: ${d.emissions.toFixed(1)} MtCO2<br/>
                Phase-out Year: ${d.phase_out_year}<br/>
                Fuel Type: ${d.fuel_type}
              </div>
            </div>`
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px")
      })
      .on("mouseout", (event: any, d: any) => {
        d3.select(event.currentTarget).attr("opacity", 0.8).attr("stroke", "#ffffff").attr("stroke-width", 0.8) // Increased from 0.5
        tooltip.transition().duration(500).style("opacity", 0)
      })
  }, [validData, projection, colorScale, getSymbol, sizeScale, currentYear, colors, currentTheme])

  const updateLegend = useCallback(() => {
    if (!svgRef.current || !projection) return

    const svg = d3.select(svgRef.current)
    const legendContainer = svg.select(".legend-container")
    
    // Remove existing legends
    legendContainer.selectAll("*").remove()
    
    // Create new legend group
    const legendGroup = legendContainer.append("g").attr("class", "legend-group")
    
    // Calculate responsive legend position
    const legendWidth = Math.max(160, Math.min(200, dimensions.width * 0.4)) // Ensure minimum width of 160px
    const legendHeight = 60
    
    // Position legends much lower on the map
    const legendX = dimensions.width - legendWidth - margin.right
    const legendY = dimensions.height - legendHeight - 30
    
    // Add fuel type legend - position above the phase-out year legend with more space
    const fuelLegendX = legendX
    const fuelLegendY = legendY - 55
    
    // Create fuel legend group
    const fuelLegend = legendContainer
      .append("g")
      .attr("class", "fuel-legend")
    
    // Fuel legend background - increased height for more space
    fuelLegend
      .append("rect")
      .attr("x", fuelLegendX)
      .attr("y", fuelLegendY)
      .attr("width", legendWidth)
      .attr("height", 40)
      .attr("fill", colors.legendFill)
      .attr("stroke", colors.legendStroke)
      .attr("stroke-width", 1)
      .attr("rx", 4)
      .attr("opacity", 0.8)
    
    // Fuel legend title - using same font size as phase-out year title
    fuelLegend
      .append("text")
      .attr("x", fuelLegendX + 10)
      .attr("y", fuelLegendY + 15)
      .attr("fill", colors.text)
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text("Fuel Types")
    
    const fuelTypes = [
      { type: "Coal", symbol: d3.symbolCircle },
      { type: "Gas", symbol: d3.symbolTriangle },
      { type: "Oil", symbol: d3.symbolSquare },
    ]
    
    // Calculate spacing based on available width, ensuring minimum spacing
    const itemWidth = Math.max(50, legendWidth / fuelTypes.length) // Ensure minimum item width
    
    // Position fuel symbols much lower to avoid overlap with title
    fuelTypes.forEach((fuel, i) => {
      const symbolGen = d3.symbol().type(fuel.symbol).size(50)
      
      fuelLegend
        .append("path")
        .attr("d", symbolGen)
        .attr("transform", `translate(${fuelLegendX + (i + 0.5) * itemWidth - 15}, ${fuelLegendY + 28})`) // Moved even lower
        .attr("fill", currentTheme === "dark" ? "#ffffff" : "#000000") // Monochrome based on theme
        .attr("stroke", "none")
        .attr("opacity", 0.9)
        
      fuelLegend
        .append("text")
        .attr("x", fuelLegendX + (i + 0.5) * itemWidth)
        .attr("y", fuelLegendY + 31) // Moved even lower
        .attr("text-anchor", "middle")
        .attr("fill", colors.text)
        .attr("font-size", "9px")
        .text(fuel.type)
    })
    
    // Phase-out year legend background
    legendGroup
      .append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .attr("fill", colors.legendFill)
      .attr("stroke", colors.legendStroke)
      .attr("stroke-width", 1)
      .attr("rx", 4)
      .attr("opacity", 0.8)
    
    // Phase-out year legend title - font size already 12px
    legendGroup
      .append("text")
      .attr("x", legendX + 10)
      .attr("y", legendY + 20)
      .attr("fill", colors.text)
      .attr("font-size", "12px") // Already standardized
      .attr("font-weight", "bold")
      .text("Phase-out Year")
    
    // Legend gradient
    const gradientWidth = legendWidth - 20
    const gradientHeight = 10
    const gradientX = legendX + 10
    const gradientY = legendY + 30
    
    // Create gradient stops
    const gradientStops = d3.range(2025, 2051, 5).map((year: any) => ({
      year,
      color: colorScale(year),
      x: ((year - 2025) / 25) * gradientWidth,
    }))
    
    // Add gradient rectangles
    gradientStops.forEach((stop: any, i: any) => {
      if (i < gradientStops.length - 1) {
        const width = gradientStops[i + 1].x - stop.x
        legendGroup
          .append("rect")
          .attr("x", gradientX + stop.x)
          .attr("y", gradientY)
          .attr("width", width)
          .attr("height", gradientHeight)
          .attr("fill", stop.color)
      }
    })
    
    // Add gradient labels
    legendGroup
      .append("text")
      .attr("x", gradientX)
      .attr("y", gradientY + gradientHeight + 15)
      .attr("fill", colors.text)
      .attr("font-size", "10px")
      .text("2025")
    
    legendGroup
      .append("text")
      .attr("x", gradientX + gradientWidth)
      .attr("y", gradientY + gradientHeight + 15)
      .attr("text-anchor", "end")
      .attr("fill", colors.text)
      .attr("font-size", "10px")
      .text("2050")
    
    // Add bottom description text - positioned at the very bottom
    legendContainer
      .append("text")
      .attr("class", "description-text")
      .attr("x", dimensions.width / 2)
      .attr("y", dimensions.height - 10)
      .attr("text-anchor", "middle")
      .attr("fill", colors.text)
      .attr("font-size", "12px")
      .text("Note: Marker size proportional to emissions")
    
  }, [dimensions, colors, margin, projection, colorScale, currentTheme])

  // Helper function to load state/province boundaries
  const loadStateProvinces = useCallback((countryCode: string, mapContainer: d3.Selection<SVGGElement, unknown, null, undefined>, path: d3.GeoPath<any, any>, borderColor: string) => {
    const iso3Code = convertToIso3(countryCode)
    const countryName = COUNTRY_NAMES[countryCode.toLowerCase()] || ''
    
    console.log(`Loading state/province data for ${countryCode} (${iso3Code}) - ${countryName}`)
    
    // Try multiple sources in sequence for better reliability
    const loadFromDeldersveld = () => {
      const url = STATE_BOUNDARY_SOURCES.deldersveld[countryCode.toLowerCase() as keyof typeof STATE_BOUNDARY_SOURCES.deldersveld]
      if (!url) {
        console.log(`No deldersveld source for ${countryCode}, trying geoBoundaries`)
        return loadFromGeoBoundaries()
      }
      
      return d3.json(url)
        .then((topoData: any) => {
          if (!topoData || !topoData.objects) {
            throw new Error(`Invalid TopoJSON data from deldersveld for ${countryCode}`)
          }
          
          // Find the first object in the TopoJSON
          const objectKey = Object.keys(topoData.objects)[0]
          if (!objectKey) {
            throw new Error(`No objects found in TopoJSON for ${countryCode}`)
          }
          
          // Convert TopoJSON to GeoJSON
          const geoData = feature(topoData, topoData.objects[objectKey]) as unknown as FeatureCollection<Geometry>
          
          if (!geoData || !geoData.features || !geoData.features.length) {
            throw new Error(`No features found in GeoJSON for ${countryCode}`)
          }
          
          console.log(`Successfully loaded ${geoData.features.length} state/province features for ${countryCode} from deldersveld`)
          
          // Add the state/province boundaries
          mapContainer
            .select(".states-group")
            .selectAll("path")
            .data(geoData.features)
            .enter()
            .append("path")
            .attr("d", (d) => path(d as any) || "")
            .attr("fill", "none")
            .attr("stroke", borderColor)
            .attr("stroke-width", 0.6)
            .attr("stroke-dasharray", "1,1")
          
          return geoData
        })
        .catch((error) => {
          console.error(`Error loading deldersveld data for ${countryCode}:`, error)
          return loadFromGeoBoundaries()
        })
    }
    
    const loadFromGeoBoundaries = () => {
      const url = `${STATE_BOUNDARY_SOURCES.geoBoundaries.base}${iso3Code}${STATE_BOUNDARY_SOURCES.geoBoundaries.format}`
      
      return d3.json(url)
        .then((geoData: any) => {
          if (!geoData || !geoData.features || !geoData.features.length) {
            throw new Error(`No features found in GeoJSON from geoBoundaries for ${countryCode}`)
          }
          
          console.log(`Successfully loaded ${geoData.features.length} state/province features for ${countryCode} from geoBoundaries`)
          
          // Add the state/province boundaries
          mapContainer
            .select(".states-group")
            .selectAll("path")
            .data(geoData.features)
            .enter()
            .append("path")
            .attr("d", (d) => path(d as any) || "")
            .attr("fill", "none")
            .attr("stroke", borderColor)
            .attr("stroke-width", 0.6)
            .attr("stroke-dasharray", "1,1")
          
          return geoData
        })
        .catch((error) => {
          console.error(`Error loading geoBoundaries data for ${countryCode}:`, error)
          return loadFromNaturalEarth()
        })
    }
    
    const loadFromNaturalEarth = () => {
      return d3.json(STATE_BOUNDARY_SOURCES.naturalEarth)
        .then((geoData: any) => {
          if (!geoData || !geoData.features || !geoData.features.length) {
            throw new Error(`No features found in GeoJSON from Natural Earth for ${countryCode}`)
          }
          
          // Filter features to only include the current country
          const countryFeatures = geoData.features.filter((feature: any) => {
            // Try multiple properties that might contain country codes
            return (
              (feature.properties.iso_a2 && feature.properties.iso_a2.toLowerCase() === countryCode.toLowerCase()) ||
              (feature.properties.iso_a3 && feature.properties.iso_a3 === iso3Code) ||
              (feature.properties.adm0_a3 && feature.properties.adm0_a3 === iso3Code) ||
              (feature.properties.admin && feature.properties.admin.includes(countryName))
            )
          })
          
          if (!countryFeatures.length) {
            throw new Error(`No features found for ${countryCode} in Natural Earth data`)
          }
          
          console.log(`Successfully loaded ${countryFeatures.length} state/province features for ${countryCode} from Natural Earth`)
          
          // Add the state/province boundaries
          mapContainer
            .select(".states-group")
            .selectAll("path")
            .data(countryFeatures)
            .enter()
            .append("path")
            .attr("d", (d) => path(d as any) || "")
            .attr("fill", "none")
            .attr("stroke", borderColor)
            .attr("stroke-width", 0.6)
            .attr("stroke-dasharray", "1,1")
          
          return { type: "FeatureCollection", features: countryFeatures }
        })
        .catch((error) => {
          console.error(`Error loading Natural Earth data for ${countryCode}:`, error)
          return Promise.reject(error)
        })
    }
    
    // Start the loading chain with the most reliable source
    return loadFromDeldersveld()
      .catch(error => {
        console.error(`All state/province data sources failed for ${countryCode}:`, error)
        return null
      })
  }, [])

  const initializeMap = useCallback(() => {
    if (!data || !svgRef.current || !projection || mapInitialized) return

    // Clear existing content
    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    try {
      // Set the background color for the entire SVG
      svg.append("rect")
        .attr("width", dimensions.width)
        .attr("height", dimensions.height)
        .attr("fill", colors.background)

      // Create separate containers for map and legends
      const mapContainer = svg.append("g").attr("class", "map-container")
      mapContainer.append("g").attr("class", "countries-group")
      mapContainer.append("g").attr("class", "states-group") // Add a group for states/provinces
      mapContainer.append("g").attr("class", "cities-group") // Add a group for cities
      mapContainer.append("g").attr("class", "points-group")

      // Create legend container that won't be affected by zoom
      svg.append("g").attr("class", "legend-container")

      // Create and store the zoom behavior
      const zoom = d3
        .zoom()
        .scaleExtent([1, 8])
        .translateExtent([
          [0, 0],
          [dimensions.width || 800, dimensions.height || 600], // Provide fallback values
        ])
        .on("zoom", (event: any) => {
          // Use explicit transform values instead of the event transform directly
          const transform = event.transform;
          mapContainer.attr("transform", `translate(${transform.x}, ${transform.y}) scale(${transform.k})`)
        })

      // Store the zoom reference for later use
      zoomRef.current = zoom

      // Initialize with identity transform
      initialTransformRef.current = d3.zoomIdentity
      
      // Apply zoom behavior to SVG with explicit size
      svg
        .attr("width", dimensions.width || 800)
        .attr("height", dimensions.height || 600)
        .call(zoom as any)

      const path = d3.geoPath().projection(projection)

      // Load world map data - fallback to just countries if states data fails
      d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
        .then((worldData: any) => {
          if (!worldData) {
            throw new Error("Failed to load world data")
          }

          const countries = feature(worldData, worldData.objects.countries) as unknown as FeatureCollection<Geometry>
          
          // Update country paths with theme-appropriate colors and increased line weight
          mapContainer
            .select(".countries-group")
            .selectAll("path")
            .data(countries.features)
            .enter()
            .append("path")
            .attr("d", (d) => path(d as any) || "")
            .attr("fill", colors.land)
            .attr("stroke", colors.border)
            .attr("stroke-width", 0.8)

          // Add major cities
          const citiesForCountry = MAJOR_CITIES[country.toLowerCase() as keyof typeof MAJOR_CITIES] || []
          
          if (citiesForCountry.length > 0) {
            const citiesGroup = mapContainer.select(".cities-group")
            
            // Add city markers - made much smaller (1.5px instead of 3px)
            citiesGroup
              .selectAll("circle")
              .data(citiesForCountry)
              .enter()
              .append("circle")
              .attr("cx", (d) => {
                const coords = projection([d.lon, d.lat])
                return coords ? coords[0] : 0
              })
              .attr("cy", (d) => {
                const coords = projection([d.lon, d.lat])
                return coords ? coords[1] : 0
              })
              .attr("r", 1.5) // Reduced from 3 to 1.5
              .attr("fill", colors.cityMarker)
              .attr("stroke", "#ffffff")
              .attr("stroke-width", 0.5) // Reduced from 1 to 0.5
            
            // Add city labels - moved slightly further from the dot
            citiesGroup
              .selectAll("text")
              .data(citiesForCountry)
              .enter()
              .append("text")
              .attr("x", (d) => {
                const coords = projection([d.lon, d.lat])
                return coords ? coords[0] + 3 : 0 // Reduced from 5 to 3
              })
              .attr("y", (d) => {
                const coords = projection([d.lon, d.lat])
                return coords ? coords[1] + 3 : 0
              })
              .attr("font-size", "7px") // Reduced from 8px to 7px
              .attr("fill", colors.cityLabel)
              .text((d) => d.name)
              .attr("class", "city-label")
          }

          // Load state boundaries using a more reliable approach with multiple sources
          loadStateProvinces(country, mapContainer, path, colors.stateBorder)
            .finally(() => {
              // Add points and legend regardless of state data success
              updatePoints()
              updateLegend()
              handleResetView()
              setMapInitialized(true)
            })
        })
        .catch((error: any) => {
          console.error("Error loading map data:", error)
          setError("Failed to load map data. Please try again later.")
        })
    } catch (err: any) {
      console.error("Error initializing map:", err)
      setError(err.message || "An error occurred while initializing the map")
    }
  }, [data, svgRef, dimensions, colors, projection, updatePoints, updateLegend, mapInitialized, country, loadStateProvinces])

  useEffect(() => {
    if (dimensions.width > 0 && !mapInitialized) {
    initializeMap()
    }
  }, [dimensions, initializeMap, mapInitialized])

  useEffect(() => {
    if (mapInitialized) {
      updatePoints()
    }
  }, [currentYear, mapInitialized, updatePoints])

  // Update legend when dimensions change
  useEffect(() => {
    if (mapInitialized && dimensions.width > 0) {
      updateLegend()
    }
  }, [dimensions, mapInitialized, updateLegend])
  
  // Update when theme changes
  useEffect(() => {
    if (mapInitialized) {
      // Update background color
      if (svgRef.current) {
        d3.select(svgRef.current)
          .select("rect")
          .attr("fill", colors.background)
      }
      
      // Update country colors
      d3.select(svgRef.current)
        .select(".countries-group")
        .selectAll("path")
        .attr("fill", colors.land)
        .attr("stroke", colors.border)
      
      // Update state borders
      d3.select(svgRef.current)
        .select(".states-group")
        .selectAll("path")
        .attr("stroke", colors.stateBorder)
      
      // Update city markers and labels
      d3.select(svgRef.current)
        .select(".cities-group")
        .selectAll("circle")
        .attr("fill", colors.cityMarker)
      
      d3.select(svgRef.current)
        .select(".cities-group")
        .selectAll("text")
        .attr("fill", colors.cityLabel)
      
      // Update legends and text
      updateLegend()
      updatePoints()
    }
  }, [colors, mapInitialized, updateLegend, updatePoints])

  const handleYearChange = (year: number) => {
    setCurrentYear(year)
  }

  const handleResetView = () => {
    if (svgRef.current && zoomRef.current) {
      // Use the stored zoom reference to reset the view
      d3.select(svgRef.current)
        .transition()
        .duration(750)
        .call(
          zoomRef.current.transform, 
          d3.zoomIdentity.translate(0, 0).scale(1)
        )
    }
  }

  // Calculate company-level statistics
  const companyStats: CompanyStats = useMemo(() => {
    if (!validData.length) return {
      totalPlants: 0,
      totalCompanies: 0,
      totalEmissions: 0,
      fuelTypeBreakdown: { Coal: 0, Gas: 0, Oil: 0 },
      averagePhaseOutYear: 0
    }

    // Get company count from actual company data
    const uniqueCompaniesCount = companyData.length > 0 ? 
      new Set(companyData.map(company => company.Company_Name)).size : 0;

    // Calculate total company emissions if available
    const totalCompanyEmissions = companyData.length > 0 ?
      companyData.reduce((sum, company) => sum + (company.Emissions || 0), 0) : 0;

    const stats = validData.reduce((acc, plant) => {
      acc.totalPlants++
      acc.totalEmissions += plant.emissions
      acc.fuelTypeBreakdown[plant.fuel_type as keyof typeof acc.fuelTypeBreakdown]++
      acc.averagePhaseOutYear += plant.phase_out_year
      return acc
    }, {
      totalPlants: 0,
      totalCompanies: uniqueCompaniesCount || 0, // Use actual company count
      totalEmissions: 0,
      fuelTypeBreakdown: { Coal: 0, Gas: 0, Oil: 0 },
      averagePhaseOutYear: 0
    })

    stats.averagePhaseOutYear = stats.totalPlants > 0 
      ? Math.round(stats.averagePhaseOutYear / stats.totalPlants) 
      : 0

    return stats
  }, [validData, companyData])

  if (!data || data.length === 0) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <span className="text-muted-foreground text-lg">
          No power plant data available for this country and scenario.
        </span>
      </div>
    )
  }

  return (
    <Card className="p-0 bg-background dark:bg-background border-0">
      {invalidDataCount > 0 && (
        <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/50 p-4 mb-2">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Missing Location Data
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>
                  {invalidDataCount} power {invalidDataCount === 1 ? 'plant has' : 'plants have'} missing or invalid coordinates and {invalidDataCount === 1 ? 'is' : 'are'} not shown on the map.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-0 lg:h-[520px]">
        <div className="lg:col-span-2 pr-0 lg:pr-4 h-[calc(100vh-24rem)] min-h-[500px] lg:h-full">
          <div className="h-full flex flex-col">
            {/* Map Container */}
            <div 
              ref={containerRef} 
              className="relative w-full flex-1 rounded-none lg:rounded-lg bg-[#2F3A2F] dark:bg-[#2F3A2F] overflow-hidden" 
            >
              {/* Map controls */}
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetView}
                  className="bg-background/80 backdrop-blur-sm"
                >
                  <Home className="h-4 w-4 mr-1" />
                  Reset View
                </Button>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm">
                      <Info className="h-4 w-4 mr-1" />
                      Info
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Figure Notes</DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="text-sm leading-relaxed whitespace-pre-line">
                      {FIGURE_NOTES}
                    </DialogDescription>
                  </DialogContent>
                </Dialog>
              </div>
              
              {/* SVG Map */}
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                style={{ background: colors.background }}
                className="overflow-hidden"
                preserveAspectRatio="xMidYMid meet"
              >
                <rect
                  width="100%"
                  height="100%"
                  fill={colors.background}
                />
                <g className="map-container" />
                <g className="legend-container" />
              </svg>
            </div>

            {/* Timeline controls */}
            <div className="h-[40px]">
              <TimelineSlider
                minYear={2025}
                maxYear={2050}
                currentYear={currentYear}
                onChange={handleYearChange}
              />
            </div>
          </div>
        </div>

        {/* Company Statistics Summary */}
        <div className="lg:col-span-1 h-[calc(100vh-24rem)] min-h-[500px] lg:h-full">
          <Card className="h-full bg-white dark:bg-black border border-[#E5E5E5] dark:border-[#4A4A4A] overflow-y-auto">
            <div className="flex justify-between items-center mb-2 p-4 pb-0">
              <h3 className="text-xl font-semibold">Company Statistics</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Info className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Company Statistics</DialogTitle>
                  </DialogHeader>
                  <DialogDescription className="text-sm leading-relaxed whitespace-pre-line">
                    {COMPANY_STATS_NOTES}
                  </DialogDescription>
                </DialogContent>
              </Dialog>
            </div>
            
            {isLoadingCompanyData ? (
              <div className="flex justify-center items-center h-20 mt-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500"></div>
                <span className="ml-2 text-sm text-muted-foreground">Loading company data...</span>
              </div>
            ) : (
              <div className="space-y-6 p-4 pt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Power Plants</p>
                    <p className="text-2xl font-medium mt-1 text-foreground dark:text-white">{validData.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Companies</p>
                    <p className="text-2xl font-medium mt-1 text-foreground dark:text-white">{companyData.length > 0 ? new Set(companyData.map(company => company.Company_Name)).size : 0}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Emissions</p>
                    <p className="text-2xl font-medium mt-1 text-foreground dark:text-white">{companyData.length > 0 ? companyData.reduce((sum, company) => sum + (company.Emissions || 0), 0).toFixed(2) : (countryData?.Emissions_Coverage?.toFixed(2) || "0.00")} MtCO2</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average Phase-out Year</p>
                    <p className="text-2xl font-medium mt-1 text-foreground dark:text-white">{companyStats.averagePhaseOutYear}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Fuel Type Distribution</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-black p-3 rounded-lg border-0">
                      <p className="text-xs text-muted-foreground">Coal</p>
                      <p className="text-xl font-medium mt-1 text-foreground dark:text-white">{companyStats.fuelTypeBreakdown.Coal}</p>
                    </div>
                    <div className="bg-white dark:bg-black p-3 rounded-lg border-0">
                      <p className="text-xs text-muted-foreground">Gas</p>
                      <p className="text-xl font-medium mt-1 text-foreground dark:text-white">{companyStats.fuelTypeBreakdown.Gas}</p>
                    </div>
                    <div className="bg-white dark:bg-black p-3 rounded-lg border-0">
                      <p className="text-xs text-muted-foreground">Oil</p>
                      <p className="text-xl font-medium mt-1 text-foreground dark:text-white">{companyStats.fuelTypeBreakdown.Oil}</p>
                    </div>
                  </div>
                </div>
                
                {/* Company Status Distribution - Moved before Top Companies */}
                {companyData.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">Company Status</p>
                    {(() => {
                      // Calculate status distribution
                      const statusCounts = companyData.reduce((acc, company) => {
                        const status = company.Status || "unknown";
                        acc[status] = (acc[status] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      
                      // Get total for percentage calculation
                      const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
                      
                      return (
                        <div className="space-y-2">
                          {Object.entries(statusCounts).map(([status, count]) => (
                            <div key={status}>
                              <div className="flex justify-between text-xs">
                                <span className="capitalize">{status}</span>
                                <span>{count} ({((count / total) * 100).toFixed(1)}%)</span>
                              </div>
                              <div className="w-full bg-[#E5E5E5] dark:bg-[#4A4A4A] h-2 rounded-full mt-1">
                                <div
                                  className="h-full rounded-full bg-[#2F3A2F]"
                                  style={{ width: `${(count / total) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
                
                {/* Top Companies Section */}
                {companyData.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-sm text-muted-foreground">Top Companies by Emissions</p>
                      <Link 
                        href={`/company-details?country=${convertToIso3(country)}`}
                        passHref
                      >
                        <GradientButton variant="secondary" className="h-7 text-xs">
                          View All Companies
                        </GradientButton>
                      </Link>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 border border-[#E5E5E5] dark:border-[#4A4A4A] rounded-md p-2">
                      {[...companyData]
                        .sort((a, b) => (b.Emissions || 0) - (a.Emissions || 0))
                        .slice(0, 10)
                        .map((company, index) => (
                          <div key={`${company.Company_Name}-${index}`} className="flex justify-between items-center py-1 border-b border-[#E5E5E5] dark:border-[#4A4A4A] last:border-0">
                            <div className="flex items-center">
                              <span className="text-xs font-medium mr-2">{index + 1}.</span>
                              <div>
                                <p className="text-xs font-medium truncate max-w-[140px]" title={company.Company_Name}>
                                  {company.Company_Name}
                                </p>
                                <p className="text-[10px] text-muted-foreground">{company.Status} - {company.Capacity?.toFixed(0)} {company.Capacity_Unit}</p>
                              </div>
                            </div>
                            <span className="text-xs font-medium">{company.Emissions?.toFixed(3) || 0} Mt</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Card>
  )
}

