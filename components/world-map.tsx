"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

const icon = L.icon({ iconUrl: "/marker-icon.png", iconSize: [25, 41], iconAnchor: [12, 41] })

export function WorldMap({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>World Map</CardTitle>
        <CardDescription>Interactive map showing key locations</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height: "400px", width: "100%" }}>
          <MapContainer center={[0, 0]} zoom={2} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[51.505, -0.09]} icon={icon}>
              <Popup>London</Popup>
            </Marker>
            <Marker position={[40.7128, -74.006]} icon={icon}>
              <Popup>New York</Popup>
            </Marker>
            <Marker position={[35.6762, 139.6503]} icon={icon}>
              <Popup>Tokyo</Popup>
            </Marker>
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  )
}

