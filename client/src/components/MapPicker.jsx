import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { useState } from 'react'

function LocationMarker({ value, onChange }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  if (!value) return null
  return <Marker position={[value.lat, value.lng]} />
}

export default function MapPicker({ value, onChange }) {
  const [center] = useState([20.5937, 78.9629])
  return (
    <MapContainer center={center} zoom={5} style={{ height: 300 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <LocationMarker value={value} onChange={onChange} />
    </MapContainer>
  )
}