import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ISO2 to ISO3 mapping for commonly used countries
export const iso2ToIso3Map: { [key: string]: string } = {
  'eg': 'EGY',
  'id': 'IDN',
  'in': 'IND',
  'ir': 'IRN',
  'ke': 'KEN',
  'mx': 'MEX',
  'ng': 'NGA',
  'th': 'THA',
  'tz': 'TZA',
  'ug': 'UGA',
  'vn': 'VNM',
  'za': 'ZAF'
} as const

export function convertToIso3(countryCode: string): string {
  // If it's already an ISO3 code (3 characters), return as is
  if (countryCode.length === 3) {
    return countryCode.toUpperCase()
  }
  
  // Convert ISO2 to ISO3
  const iso2 = countryCode.toLowerCase()
  const iso3 = iso2ToIso3Map[iso2]
  
  if (!iso3) {
    console.warn(`No ISO3 mapping found for country code: ${countryCode}`)
    return countryCode.toUpperCase()
  }
  
  return iso3
}
