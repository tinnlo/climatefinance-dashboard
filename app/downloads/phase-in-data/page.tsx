import { Metadata } from "next"
import { DownloadPhaseIn } from "@/components/download-phase-in"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

// Simple PageHeader component to fix the linter error
function PageHeader({
  heading,
  subheading,
  children,
}: {
  heading: string;
  subheading?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col space-y-2">
      <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
      {subheading && <p className="text-muted-foreground">{subheading}</p>}
      {children}
    </div>
  );
}

export const metadata: Metadata = {
  title: "Download Phase-In Data | Climate Finance Analytics",
  description: "Download capacity phase-in data for various renewable energy technologies and storage solutions.",
}

export default function DownloadPhaseInPage({
  searchParams,
}: {
  searchParams: { country?: string }
}) {
  // Use the country from search params or default to US
  const country = searchParams.country || "US"

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-forest/30">
      <div className="mx-auto max-w-4xl py-8 px-4">
        {/* Breadcrumb navigation */}
        <div className="flex items-center mb-6">
          <Link 
            href="/dashboard" 
            className="flex items-center hover:text-foreground/80"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
        
        <PageHeader
          heading="Download Phase-In Capacity Data"
          subheading="Access and download renewable energy and storage technology capacity phase-in data by country"
        />
        <DownloadPhaseIn country={country} />
        
        {/* Return to Dashboard button at the bottom center */}
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