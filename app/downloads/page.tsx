import { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, BarChart2, LineChart, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"

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
  title: "Data Downloads | Climate Finance Analytics",
  description: "Access and download data from the Climate Finance Analytics platform.",
}

export default function DownloadsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background/95 to-forest/30">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl py-8 px-4">
          <PageHeader
            heading="Climate Finance Data Downloads"
            subheading="Access and download datasets from our platform for your analysis"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">

            {/* System Cost Benefits */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChart className="mr-2 h-5 w-5 text-green-500" />
                  Investment Needs & Reduced Damages
                </CardTitle>
                <CardDescription>
                Investment Needs & Reduced Damages
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  Download time series data on system-level cost benefits, including 
                  climate and health benefits, emissions reduction, and more.
                </p>
              </CardContent>
              <CardFooter>
                <Link href="/downloads/system-cost-benefits" className="w-full">
                  <Button className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Access Data
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Stacked Cost Data */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart2 className="mr-2 h-5 w-5 text-orange-500" />
                  Investment Needs and Reduced Damages over time
                </CardTitle>
                <CardDescription>
                  Investment needs and reduced damages over time
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  Download data on investment needs and reduced damages over time
                </p>
              </CardContent>
              <CardFooter>
                <Link href="/downloads/stacked-data?type=cost" className="w-full">
                  <Button className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Access Data
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Phase-In Data */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Layers className="mr-2 h-5 w-5 text-blue-500" />
                  Phase-In Capacity Data
                </CardTitle>
                <CardDescription>
                  Renewable energy and storage technology capacity phase-in data
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  Download time series data on renewable energy and storage technology capacity additions.
                  Includes capacity for solar, wind, geothermal, and storage technologies.
                </p>
              </CardContent>
              <CardFooter>
                <Link href="/downloads/phase-in-data" className="w-full">
                  <Button className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Access Data
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
          
          {/* Return to Dashboard button at the bottom center */}
          <div className="flex justify-center mt-8">
            <Link href="/dashboard">
              <Button variant="outline" className="w-auto">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
} 