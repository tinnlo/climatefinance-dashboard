"use client"

import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import * as d3 from "d3"
import { feature } from "topojson-client"
import { TimelineSlider } from "./timeline-slider"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"
import { useTheme } from "next-themes"

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

  const margin = { top: 20, right: 30, bottom: 40, left: 40 }

  // Get the actual theme considering system preference
  const currentTheme = theme === "system" ? systemTheme : theme

  // Define color variables for light and dark modes
  const colors = useMemo(
    () => ({
      background: currentTheme === "dark" ? "#000000" : "#ffffff",
      land: currentTheme === "dark" ? "#000000" : "#ffffff",
      border: currentTheme === "dark" ? "#333333" : "#cccccc",
      text: currentTheme === "dark" ? "#ffffff" : "#000000",
      controls: currentTheme === "dark" ? "#333333" : "#ffffff",
      legendFill: currentTheme === "dark" ? "#000000" : "#ffffff",
      legendStroke: currentTheme === "dark" ? "#ffffff" : "#000000",
    }),
    [currentTheme],
  )

  const projection = useMemo(() => {
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
  }, [data, dimensions])

  const colorScale = useMemo(
    () => d3.scaleSequential().domain([2025, 2050]).interpolator(d3.interpolate("#ffeda0", "#bd0026")),
    [],
  )

  const sizeScale = useMemo(
    () =>
      d3
        .scaleSqrt()
        .domain([0, d3.max(data, (d) => d.emissions) || 0])
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

  const updatePoints = useCallback(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    const pointsGroup = svg.select(".points-group")

    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", colors.controls)
      .style("color", colors.text)
      .style("border", "solid")
      .style("border-width", "1px")
      .style("border-radius", "5px")
      .style("padding", "10px")

    pointsGroup
      .selectAll(".plant-point")
      .data(data, (d: any) => d.uniqueId)
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "plant-point")
            .attr("d", (d) => {
              const symbol = d3
                .symbol()
                .type(getSymbol(d.fuel_type))
                .size(sizeScale(d.emissions) * 25)
              return symbol()
            })
            .attr("transform", (d) => {
              const coords = projection([d.longitude, d.latitude])
              return coords ? `translate(${coords[0]},${coords[1]})` : null
            })
            .attr("fill", (d) => colorScale(d.phase_out_year))
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 0.5)
            .attr("opacity", 0.6),
        (update) => update,
      )
      .attr("visibility", (d) => (d.phase_out_year <= currentYear ? "visible" : "hidden"))
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).attr("opacity", 1).attr("stroke", colors.border).attr("stroke-width", 2)
        tooltip.transition().duration(200).style("opacity", 0.9)
        tooltip
          .html(`Asset: ${d.name}<br/>Emissions: ${d.emissions.toFixed(2)}`)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px")
      })
      .on("mouseout", (event, d) => {
        d3.select(event.currentTarget).attr("opacity", 0.6).attr("stroke", null).attr("stroke-width", null)
        tooltip.transition().duration(500).style("opacity", 0)
      })
  }, [data, projection, colorScale, getSymbol, sizeScale, currentYear, colors])

  const initializeMap = useCallback(() => {
    if (!data || !svgRef.current || mapInitialized) return

    const svg = d3.select(svgRef.current)

    try {
      svg.selectAll("*").remove()

      // Set the background color for the entire SVG
      svg.append("rect").attr("width", "100%").attr("height", "100%").attr("fill", colors.background)

      const container = svg.append("g").attr("class", "map-container")

      const zoom = d3
        .zoom()
        .scaleExtent([1, 8])
        .translateExtent([
          [-200, -200],
          [dimensions.width + 200, dimensions.height + 200],
        ])
        .on("zoom", (event) => {
          container.attr("transform", event.transform)
        })

      svg.call(zoom as any)

      initialTransformRef.current = d3.zoomIdentity

      const path = d3.geoPath().projection(projection)

      d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then((worldData: any) => {
        const countries = feature(worldData, worldData.objects.countries)

        // Update country paths with theme-appropriate colors
        container
          .append("g")
          .selectAll("path")
          .data(countries.features)
          .enter()
          .append("path")
          .attr("class", "country-path")
          .attr("d", path as any)
          .attr("fill", colors.land)
          .attr("stroke", colors.border)
          .attr("stroke-width", 0.5)

        container.append("g").attr("class", "points-group")

        const legendGroup = svg.append("g").attr("transform", `translate(${dimensions.width - 180}, 20)`)

        const legendHeight = 200
        const legendWidth = 20
        const legendScale = d3.scaleLinear().domain([2025, 2050]).range([0, legendHeight])

        const legendAxis = d3.axisRight(legendScale).tickFormat(d3.format("d")).ticks(5)

        const gradient = legendGroup
          .append("defs")
          .append("linearGradient")
          .attr("id", "phase-out-gradient")
          .attr("x1", "0%")
          .attr("x2", "0%")
          .attr("y1", "0%")
          .attr("y2", "100%")

        gradient
          .selectAll("stop")
          .data(d3.range(0, 1.1, 0.1))
          .enter()
          .append("stop")
          .attr("offset", (d) => `${d * 100}%`)
          .attr("stop-color", (d) => {
            const color = colorScale(2025 + d * 25)
            return d3.color(color)?.copy({ opacity: 1 })?.formatRgb() || color
          })

        legendGroup
          .append("rect")
          .attr("width", legendWidth)
          .attr("height", legendHeight)
          .style("fill", "url(#phase-out-gradient)")

        legendGroup
          .append("g")
          .attr("transform", `translate(${legendWidth}, 0)`)
          .call(legendAxis)
          .attr("color", colors.text)

        legendGroup
          .append("text")
          .attr("x", -10)
          .attr("y", -10)
          .text("Phase-out Year")
          .style("font-size", "12px")
          .attr("fill", colors.text)

        const fuelTypes = ["Coal", "Oil", "Gas"]
        const fuelLegend = svg
          .append("g")
          .attr("class", "fuel-legend")
          .attr("transform", `translate(${dimensions.width - 180}, ${dimensions.height - 80})`)

        fuelTypes.forEach((fuel, i) => {
          const symbol = d3.symbol().type(getSymbol(fuel)).size(100)

          fuelLegend
            .append("path")
            .attr("class", `fuel-symbol ${fuel.toLowerCase()}`)
            .attr("d", symbol())
            .attr("transform", `translate(10, ${i * 20})`)
            .attr("fill", currentTheme === "dark" ? "#ffffff" : "#000000")
            .attr("stroke", "none")

          fuelLegend
            .append("text")
            .attr("x", 25)
            .attr("y", i * 20 + 5)
            .text(fuel)
            .style("font-size", "12px")
            .attr("fill", colors.text)
        })

        // Remove the duplicate note text from the map
        // Only keep the one in the center
        svg
          .selectAll("text")
          .filter(function () {
            return d3.select(this).text() === "Note: Marker size proportional to emissions"
          })
          .remove()

        // Update the note text position to be in the center
        svg
          .append("text")
          .attr("x", dimensions.width / 2)
          .attr("y", dimensions.height - 10)
          .attr("text-anchor", "middle")
          .style("font-size", "12px")
          .attr("fill", colors.text)
          .text("Note: Marker size proportional to emissions")

        // Zoom controls
        const controlsGroup = svg.append("g").attr("transform", `translate(20, ${dimensions.height - 100})`)
        controlsGroup.attr("class", "controls")

        const zoomControls = controlsGroup.append("g")
        zoomControls
          .append("rect")
          .attr("width", 30)
          .attr("height", 60)
          .attr("fill", colors.controls)
          .attr("stroke", colors.border)

        zoomControls
          .append("text")
          .attr("x", 15)
          .attr("y", 20)
          .attr("text-anchor", "middle")
          .style("font-size", "16px")
          .style("cursor", "pointer")
          .attr("fill", colors.text)
          .text("+")
          .on("click", () => {
            svg
              .transition()
              .duration(750)
              .call(zoom.scaleBy as any, 1.5)
          })

        zoomControls
          .append("text")
          .attr("x", 15)
          .attr("y", 50)
          .attr("text-anchor", "middle")
          .style("font-size", "16px")
          .style("cursor", "pointer")
          .attr("fill", colors.text)
          .text("−")
          .on("click", () => {
            svg
              .transition()
              .duration(750)
              .call(zoom.scaleBy as any, 0.67)
          })

        // Home button
        const homeButton = controlsGroup.append("g").attr("transform", "translate(0, 70)")
        homeButton
          .append("rect")
          .attr("width", 30)
          .attr("height", 30)
          .attr("fill", colors.controls)
          .attr("stroke", colors.border)
          .style("cursor", "pointer")

        homeButton
          .append("text")
          .attr("x", 15)
          .attr("y", 20)
          .attr("text-anchor", "middle")
          .style("font-size", "12px")
          .style("cursor", "pointer")
          .attr("fill", colors.text)
          .text("⌂")
          .on("click", () => {
            svg
              .transition()
              .duration(750)
              .call(zoom.transform as any, initialTransformRef.current!)
          })

        setMapInitialized(true)
        updatePoints()
      })
    } catch (err) {
      console.error("Error rendering map:", err)
      setError("An error occurred while rendering the map")
    }
  }, [data, projection, colorScale, getSymbol, updatePoints, mapInitialized, colors, dimensions, currentTheme])

  useEffect(() => {
    initializeMap()
  }, [initializeMap])

  useEffect(() => {
    if (mapInitialized) {
      updatePoints()
    }
  }, [mapInitialized, updatePoints])

  // Update map when theme changes
  useEffect(() => {
    if (svgRef.current && mapInitialized) {
      const svg = d3.select(svgRef.current)

      // Update background
      svg.select("rect").attr("fill", colors.background)

      // Update country paths
      svg.selectAll("path.country-path").attr("fill", colors.land).attr("stroke", colors.border)

      // Update text elements
      svg.selectAll("text").attr("fill", colors.text)

      // Update controls
      svg.selectAll(".controls rect").attr("fill", colors.controls)

      // Update legend shapes
      svg
        .selectAll(".fuel-legend .fuel-symbol")
        .attr("fill", currentTheme === "dark" ? "#ffffff" : "#000000")
        .attr("stroke", "none")

      // Don't reset the points, just update their visibility
      updatePoints()
    }
  }, [colors, mapInitialized, updatePoints, currentTheme])

  const handleYearChange = (year: number) => {
    setCurrentYear(year)
  }

  const handleResetView = useCallback(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current)
      const zoom = d3
        .zoom()
        .scaleExtent([1, 8])
        .translateExtent([
          [-200, -200],
          [dimensions.width + 200, dimensions.height + 200],
        ])

      svg
        .transition()
        .duration(750)
        .call(zoom.transform as any, d3.zoomIdentity)

      svg.select(".map-container").transition().duration(750).attr("transform", "translate(0,0) scale(1)")
    }
  }, [dimensions])

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="relative w-full h-[400px]" style={{ backgroundColor: colors.background }}>
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          preserveAspectRatio="xMidYMid meet"
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <TimelineSlider minYear={2025} maxYear={2050} currentYear={currentYear} onChange={handleYearChange} />
        <Button variant="outline" size="sm" onClick={handleResetView}>
          <Home className="mr-2 h-4 w-4" />
          Reset View
        </Button>
      </div>
    </div>
  )
}

