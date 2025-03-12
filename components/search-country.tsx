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
    <div className="w-full max-w-[280px]">
      <Select defaultValue={defaultValue} onValueChange={onCountryChange}>
        <SelectTrigger className="w-full">
          <Search className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Select a country" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {countries.map((country) => (
              <SelectItem
                key={country.value}
                value={country.value}
                className="cursor-pointer"
              >
                {country.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

