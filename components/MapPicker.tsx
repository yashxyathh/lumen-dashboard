"use client";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useState } from "react";

// Fix for default Leaflet icon missing in Next.js
const icon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function MapPicker({ onChange, initialLocation }: any) {
  const [position, setPosition] = useState(initialLocation || { lat: 20.5937, lng: 78.9629 }); // Default to India center

  function LocationMarker() {
    useMapEvents({
      click(e) {
        setPosition(e.latlng);
        onChange(e.latlng);
      },
    });

    return position === null ? null : (
      <Marker position={position} icon={icon} />
    );
  }

  return (
    <MapContainer center={position} zoom={13} style={{ height: "300px", width: "100%", borderRadius: "10px" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <LocationMarker />
    </MapContainer>
  );
}