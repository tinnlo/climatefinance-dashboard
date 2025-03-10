import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ISO2 to ISO3 mapping for commonly used countries
export const iso2ToIso3Map: { [key: string]: string } = {
  'in': 'IND',
  'id': 'IDN',
  'us': 'USA',
  'vn': 'VNM',
  'tr': 'TUR',
  'de': 'DEU',
  'pl': 'POL',
  'kz': 'KAZ',
  'gb': 'GBR',
  'cn': 'CHN',
  'jp': 'JPN',
  'kr': 'KOR',
  'au': 'AUS',
  'br': 'BRA',
  'ca': 'CAN',
  'fr': 'FRA',
  'it': 'ITA',
  'mx': 'MEX',
  'ru': 'RUS',
  'za': 'ZAF'
}

export function convertToIso3(countryCode: string): string {
  // If it's already an ISO3 code (3 characters), return as is
  if (countryCode.length === 3) {
    return countryCode.toUpperCase()
  }
  
  // Convert ISO2 to ISO3
  const iso2 = countryCode.toLowerCase()
  return iso2ToIso3Map[iso2] || countryCode.toUpperCase()
}
