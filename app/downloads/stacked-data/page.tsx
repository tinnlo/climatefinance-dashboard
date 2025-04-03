"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DownloadStackedCost } from "@/components/download-stacked-cost"
import { DownloadStackedBenefit } from "@/components/download-stacked-benefit"
import { useSearchParams } from 'next/navigation'
import { useRouter } from "next/navigation"
import { COUNTRY_NAMES } from "@/lib/constants"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function StackedDataDownloadPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const currentTab = searchParams?.get('type') || 'cost'
  const country = searchParams?.get('country') || 'in'

  const handleTabChange = (value: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('type', value)
    if (country) {
      url.searchParams.set('country', country)
    }
    router.push(url.pathname + url.search)
  }

  return (
    <div className="min-h-screen bg-[#1A2A1A]">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <Link 
            href="/dashboard" 
            className="flex items-center text-white hover:text-blue-300"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <div className="w-full">
          <Tabs
            value={currentTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="mx-auto mb-4">
              <TabsTrigger value="cost">Cost Data</TabsTrigger>
              <TabsTrigger value="benefit">Benefit Data</TabsTrigger>
            </TabsList>
            <div className="w-full">
              <TabsContent value="cost" className="mt-0 w-full">
                <DownloadStackedCost country={country} />
              </TabsContent>
              <TabsContent value="benefit" className="mt-0 w-full">
                <DownloadStackedBenefit country={country} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="flex justify-center mt-8">
          <Link href="/dashboard">
            <Button variant="outline" className="w-auto">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 