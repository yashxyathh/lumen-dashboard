"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useRef } from "react";
import "../../components/MapFix";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

import "leaflet/dist/leaflet.css";

export default function HeatmapPage() {

  const [issues,setIssues] = useState<any[]>([]);
  const mapRef = useRef<any>(null);

  useEffect(()=>{

    const stored = localStorage.getItem("issues");

    if(stored){
      setIssues(JSON.parse(stored));
    }

  },[]);

  useEffect(()=>{
    if(!mapRef.current) return;
    
    const L = require("leaflet");

    require("leaflet.heat");
    
    const heatPoints = issues
        .filter(i => i.location)
        .map(i => [
            i.location.lat,
            i.location.lng,
            1
        ]);

    const heat = L.heatLayer(heatPoints,{
        radius:60,
        blur:40
    });
    
    heat.addTo(mapRef.current);
  },[issues]);

  return (

    <div style={{padding:"20px"}}>

      <h1>Issue Map</h1>

      <MapContainer
        center={[12.934,80.142]}
        zoom={14}
        style={{height:"600px", width:"100%"}}
        whenCreated={(map)=> mapRef.current = map}
    >

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {issues.map((issue,index)=>(

          issue.location && (

            <Marker
              key={index}
              position={[
                issue.location.lat,
                issue.location.lng
              ]}
            >

              <Popup>

                <b>{issue.title}</b>

                <br/>

                {issue.description}

                <br/>

                Landmark: {issue.landmark}

              </Popup>

            </Marker>

          )

        ))}

      </MapContainer>

    </div>
  );
}