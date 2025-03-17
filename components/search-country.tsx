"use client"

import * as React from "react"
import { Search } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { COUNTRY_NAMES } from "@/lib/constants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Convert COUNTRY_NAMES object to array format needed for the component
const countries = Object.entries(COUNTRY_NAMES).map(([value, label]) => ({ value, label }))

export function SearchCountry({
  onCountryChange,
  defaultValue = "in",
}: {
  onCountryChange: (country: string) => void
  defaultValue?: string
}) {
  return (
    <Card className="w-full bg-background">
      <CardContent className="p-6">
        <div className="flex gap-8 items-start justify-between">
          <div className="flex-1 max-w-[60%] space-y-4">
            <div className="space-y-4 text-sm leading-6 text-muted-foreground font-light">
              <p>
              The interactive tool by the Forward Global Institute is designed to help governments, finance ministries, central banks and policy makers to plan and finance their net-zero transitions and support resilient economic growth. The dashboard provides crucial country-level data on investment costs, financing needs, and potential benefits—ranging from investment needs in low-carbon technologies, infrastructure and grid expansion to fossil fuel decommissioning and labor reskilling.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-light text-foreground">Select Country of Interest</h3>
            <div className="w-full max-w-[280px]">
              <Select defaultValue={defaultValue} onValueChange={onCountryChange}>
                <SelectTrigger className="w-full font-light">
                  <Search className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {countries.map((country) => (
                      <SelectItem
                        key={country.value}
                        value={country.value}
                        className="cursor-pointer font-light"
                      >
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

