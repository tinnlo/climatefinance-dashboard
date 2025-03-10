"use client"

import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import * as d3 from "d3"
import { feature } from "topojson-client"
import { TimelineSlider } from "./timeline-slider"
import { Button } from "@/components/ui/button"
import { Home, Info } from "lucide-react"
import { useTheme } from "next-themes"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const FIGURE_NOTES = "Placeholder for phase-out map figure notes. This will be replaced with detailed information about the methodology, data sources, and interpretation of the phase-out map visualization."

interface MapData {
  name: string
  latitude: number
  longitude: number
  fuel_type: string
  phase_out_year: number
  emissions: number
  uniqueId: string
}

interface PhaseOutMapProps {
  data: MapData[]
}

export function PhaseOutMap({ data }: PhaseOutMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentYear, setCurrentYear] = useState(2025)
  const [mapInitialized, setMapInitialized] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 })
  const initialTransformRef = useRef<d3.ZoomTransform | null>(null)
  const zoomRef = useRef<any>(null)
  const { theme, systemTheme } = useTheme()

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setDimensions({
            width: entry.contentRect.width,
            height: 400,
          })
        }
      })

      resizeObserver.observe(containerRef.current)
      return () => resizeObserver.disconnect()
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
      text: currentTheme === "dark" ? "#ffffff" : "#000000",
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
    if (dimensions.width === 0) return null;
    
    const bounds = d3.geoBounds({
      type: "FeatureCollection",
      features: data.map((d) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [d.longitude, d.latitude],
        },
        properties: {},
      })),
    })

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
                  [bounds[0][0] - 2, bounds[0][1] - 2],
                  [bounds[0][0] - 2, bounds[1][1] + 2],
                  [bounds[1][0] + 2, bounds[1][1] + 2],
                  [bounds[1][0] + 2, bounds[0][1] - 2],
                  [bounds[0][0] - 2, bounds[0][1] - 2],
                ],
              ],
            },
            properties: {},
          },
        ],
      },
    )
  }, [data, dimensions, margin])

  const colorScale = useMemo(
    () => d3.scaleSequential().domain([2025, 2050]).interpolator(d3.interpolate("#ffeda0", "#bd0026")),
    [],
  )

  const sizeScale = useMemo(
    () =>
      d3
        .scaleSqrt()
        .domain([0, d3.max(data, (d: any) => d.emissions) || 0])
        .range([0.5, 2.5]),
    [data],
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
      .data(data, (d: any) => d.uniqueId)
      .join(
        (enter: any) =>
          enter
            .append("path")
            .attr("class", "plant-point")
            .attr("d", (d: any) => {
              const symbol = d3
                .symbol()
                .type(getSymbol(d.fuel_type))
                .size(sizeScale(d.emissions) * 25)
              return symbol()
            })
            .attr("transform", (d: any) => {
              const coords = projection([d.longitude, d.latitude])
              return coords ? `translate(${coords[0]},${coords[1]})` : null
            })
            .attr("fill", (d: any) => colorScale(d.phase_out_year))
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 0.5)
            .attr("opacity", 0.8),
        (update: any) => update,
      )
      .attr("visibility", (d: any) => (d.phase_out_year <= currentYear ? "visible" : "hidden"))
      .on("mouseover", (event: any, d: any) => {
        d3.select(event.currentTarget).attr("opacity", 1).attr("stroke", colors.border).attr("stroke-width", 2)
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
        d3.select(event.currentTarget).attr("opacity", 0.8).attr("stroke", "#ffffff").attr("stroke-width", 0.5)
        tooltip.transition().duration(500).style("opacity", 0)
      })
  }, [data, projection, colorScale, getSymbol, sizeScale, currentYear, colors, currentTheme])

  const updateLegend = useCallback(() => {
    if (!svgRef.current || !projection) return

    const svg = d3.select(svgRef.current)
    const container = svg.select(".map-container")
    
    // Remove existing legends
    container.select(".legend-group").remove()
    svg.select(".fuel-legend").remove()
    svg.select(".description-text").remove()
    
    // Create new legend group
    const legendGroup = container.append("g").attr("class", "legend-group")
    
    // Calculate responsive legend position
    const legendWidth = Math.min(200, dimensions.width * 0.4)
    const legendHeight = 60
    
    // Position legends much lower on the map
    // Leave only 30px from the bottom for the description text
    const legendX = dimensions.width - legendWidth - margin.right
    const legendY = dimensions.height - legendHeight - 30
    
    // Add fuel type legend - position above the phase-out year legend with more space
    const fuelLegendX = legendX
    const fuelLegendY = legendY - 55 // Significantly increased space between legends
    
    // Create fuel legend group
    const fuelLegend = svg
      .append("g")
      .attr("class", "fuel-legend")
    
    // Fuel legend background - increased height for more space
    fuelLegend
      .append("rect")
      .attr("x", fuelLegendX)
      .attr("y", fuelLegendY)
      .attr("width", legendWidth)
      .attr("height", 40) // Further increased height for better spacing
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
      .attr("font-size", "12px") // Standardized font size
      .attr("font-weight", "bold")
      .text("Fuel Types")
    
    const fuelTypes = [
      { type: "Coal", symbol: d3.symbolCircle },
      { type: "Gas", symbol: d3.symbolTriangle },
      { type: "Oil", symbol: d3.symbolSquare },
    ]
    
    // Calculate spacing based on available width
    const itemWidth = legendWidth / fuelTypes.length
    
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
    svg
      .append("text")
      .attr("class", "description-text")
      .attr("x", dimensions.width / 2)
      .attr("y", dimensions.height - 10) // Positioned at the very bottom
      .attr("text-anchor", "middle")
      .attr("fill", colors.text)
      .attr("font-size", "12px")
      .text("Note: Marker size proportional to emissions")
    
  }, [dimensions, colors, margin, projection, colorScale, currentTheme])

  const initializeMap = useCallback(() => {
    if (!data || !svgRef.current || !projection || mapInitialized) return

    const svg = d3.select(svgRef.current)

    try {
      svg.selectAll("*").remove()

      // Set the background color for the entire SVG
      svg.append("rect")
        .attr("width", dimensions.width)
        .attr("height", dimensions.height)
        .attr("fill", colors.background)

      const container = svg.append("g").attr("class", "map-container")

      // Create groups for different map elements
      container.append("g").attr("class", "countries-group")
      container.append("g").attr("class", "points-group")

      // Create and store the zoom behavior
      const zoom = d3
        .zoom()
        .scaleExtent([1, 8])
        .translateExtent([
          [0, 0],
          [dimensions.width, dimensions.height],
        ])
        .on("zoom", (event: any) => {
          container.attr("transform", event.transform)
        })

      // Store the zoom reference for later use
      zoomRef.current = zoom

      // Initialize with identity transform
      initialTransformRef.current = d3.zoomIdentity
      
      // Apply zoom behavior to SVG
      svg.call(zoom as any)

      const path = d3.geoPath().projection(projection)

      d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then((worldData: any) => {
        const countries = feature(worldData, worldData.objects.countries)

        // Update country paths with theme-appropriate colors
        container
          .select(".countries-group")
          .selectAll("path")
          .data(countries.features)
          .enter()
          .append("path")
          .attr("d", path)
          .attr("fill", colors.land)
          .attr("stroke", colors.border)
          .attr("stroke-width", 0.5)

        // Add legend
        updateLegend()
        
        // Add points
        updatePoints()

        setMapInitialized(true)
      }).catch((error: any) => {
        console.error("Error loading map data:", error)
        setError("Failed to load map data. Please try again later.")
      })
    } catch (err: any) {
      console.error("Error initializing map:", err)
      setError(err.message || "An error occurred while initializing the map")
    }
  }, [data, svgRef, dimensions, colors, projection, updatePoints, updateLegend, mapInitialized])

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
        .call(zoomRef.current.transform, d3.zoomIdentity)
    }
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <span className="text-muted-foreground text-lg">
          No data available for this country and scenario.
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div 
        ref={containerRef} 
        className="relative w-full h-[400px] overflow-hidden rounded-lg border border-border" 
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
          width={dimensions.width}
          height={dimensions.height}
          style={{ background: colors.background }}
          className="overflow-visible"
        />
      </div>
      
      {/* Timeline controls */}
      <div className="mt-4">
        <TimelineSlider
          minYear={2025}
          maxYear={2050}
          currentYear={currentYear}
          onChange={handleYearChange}
        />
      </div>
    </div>
  )
}

