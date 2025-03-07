"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { COUNTRY_NAMES } from "@/lib/constants"

interface CountryData {
  sector: string
  population: string
  assetsCount: number
  emissions: string
}

const countryDataMap: Record<string, CountryData> = {
  in: {
    sector: "Energy",
    population: "1.4 Billion",
    assetsCount: 892,
    emissions: "2.9 Gt CO2e/year",
  },
  id: {
    sector: "Energy",
    population: "273 Million",
    assetsCount: 456,
    emissions: "1.1 Gt CO2e/year",
  },
  us: {
    sector: "Energy",
    population: "331 Million",
    assetsCount: 1245,
    emissions: "5.1 Gt CO2e/year",
  },
  vn: {
    sector: "Energy",
    population: "97 Million",
    assetsCount: 312,
    emissions: "0.8 Gt CO2e/year",
  },
  tr: {
    sector: "Energy",
    population: "84 Million",
    assetsCount: 278,
    emissions: "0.5 Gt CO2e/year",
  },
  de: {
    sector: "Energy",
    population: "83 Million",
    assetsCount: 356,
    emissions: "0.7 Gt CO2e/year",
  },
  pl: {
    sector: "Energy",
    population: "38 Million",
    assetsCount: 189,
    emissions: "0.3 Gt CO2e/year",
  },
  kz: {
    sector: "Energy",
    population: "19 Million",
    assetsCount: 124,
    emissions: "0.2 Gt CO2e/year",
  },
  emde: {
    sector: "Energy",
    population: "6.7 Billion",
    assetsCount: 4567,
    emissions: "12.8 Gt CO2e/year",
  },
}

export function CountryInfo({ country = "in" }: { country?: string }) {
  const [data, setData] = useState<CountryData>(countryDataMap["in"])

  useEffect(() => {
    setData(countryDataMap[country] || countryDataMap["in"])
  }, [country])

  return (
    <Card className="dark:bg-[#2F3A2F]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-light">{COUNTRY_NAMES[country]}</CardTitle>
          <Badge variant="secondary">{data.sector}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Population</p>
              <p className="text-xl font-medium">{data.population}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Assets Covered</p>
              <p className="text-xl font-medium">{data.assetsCount}</p>
            </div>
            <div className="col-span-2 space-y-1">
              <p className="text-sm text-muted-foreground">Emissions</p>
              <p className="text-xl font-medium">{data.emissions}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

