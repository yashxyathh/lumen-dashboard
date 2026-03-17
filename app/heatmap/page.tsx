"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import "leaflet/dist/leaflet.css";

// 1. DYNAMIC IMPORTS (No SSR)
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

export default function HeatmapPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [map, setMap] = useState<any>(null); // Use state for the map instance

  // 2. FETCH DATA FROM SUPABASE
  useEffect(() => {
    async function fetchIssues() {
      const { data, error } = await supabase
        .from("issues")
        .select("*");

      if (error) {
        console.error("Error fetching issues:", error);
      } else {
        setIssues(data || []);
      }
    }
    fetchIssues();
  }, []);

  // 3. FIX INVISIBLE MARKER ICONS
  useEffect(() => {
    const L = require("leaflet");
    // This fixes the missing icon issue in Next.js
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
  }, []);

  // 4. ADD HEATMAP LAYER
  useEffect(() => {
    if (!map || issues.length === 0) return;

    const L = require("leaflet");
    require("leaflet.heat");

    const heatPoints = issues
      .filter(i => i.latitude && i.longitude)
      .map(i => [i.latitude, i.longitude, 0.5]); // Latitude, Longitude, Intensity

    const heatLayer = (L as any).heatLayer(heatPoints, {
      radius: 40,
      blur: 25,
      maxZoom: 17,
    });

    heatLayer.addTo(map);

    // Cleanup when component unmounts
    return () => {
      if (map) map.removeLayer(heatLayer);
    };
  }, [map, issues]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Issue Map & Heatmap</h1>
      <p>Red glows indicate areas with more reported issues.</p>

      <div style={{ height: "600px", width: "100%", borderRadius: "10px", overflow: "hidden" }}>
        <MapContainer
          center={[12.934, 80.142]} // Matches your previous coordinates
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          ref={setMap} // Correct way to get the map instance in newer React-Leaflet
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {issues.map((issue) => (
            issue.latitude && issue.longitude && (
              <Marker 
                key={issue.id} 
                position={[issue.latitude, issue.longitude]}
              >
                <Popup>
                  <div style={{ minWidth: "150px" }}>
                    {issue.image && (
                      <img src={issue.image} width="100%" style={{ borderRadius: "4px" }} />
                    )}
                    <h3>{issue.title}</h3>
                    <p>{issue.description}</p>
                    <small><b>Landmark:</b> {issue.landmark}</small>
                    <br />
                    <small><b>Votes:</b> {issue.upvotes || 0}</small>
                  </div>
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>
      </div>
    </div>
  );
}