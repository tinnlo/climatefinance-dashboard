"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart as ReLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const generateData = () => [
  { name: "Jan", value: 400 },
  { name: "Feb", value: 300 },
  { name: "Mar", value: 200 },
  { name: "Apr", value: 278 },
  { name: "May", value: 189 },
  { name: "Jun", value: 239 },
]

export function LineChart({ className }: { className?: string }) {
  const data = useMemo(() => generateData(), [])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Line Chart</CardTitle>
        <CardDescription>Monthly trend analysis</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <ReLineChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#8884d8" />
          </ReLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

