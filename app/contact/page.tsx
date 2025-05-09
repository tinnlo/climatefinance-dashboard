import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SearchParamsProvider } from "../components/SearchParamsProvider"

function ContactContent() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background/95 to-forest/30">
      <Header />
      <main className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-light tracking-tight">Contact Us</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Forward Global Institute</CardTitle>
              <CardDescription>Get in touch with our team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium">Address</h3>
                <p className="text-sm text-muted-foreground">
                  3 Cole Park Road, Twickenham, UK
                </p>
              </div>
              <div>
                <h3 className="font-medium">Email</h3>
                <p className="text-sm text-muted-foreground">moritzbaer@forwardanalytics.co</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Research Inquiries</CardTitle>
              <CardDescription>For academic and research collaboration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium">Research Department</h3>
                <p className="text-sm text-muted-foreground">moritzbaer@forwardanalytics.co</p>
              </div>
              <div>
                <h3 className="font-medium">Data Requests</h3>
                <p className="text-sm text-muted-foreground">mathis@forwardanalytics.co</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default function ContactPage() {
  return (
    <SearchParamsProvider>
      <ContactContent />
    </SearchParamsProvider>
  )
}

