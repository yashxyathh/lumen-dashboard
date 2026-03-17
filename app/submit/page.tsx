"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { 
  ssr: false,
  loading: () => <p style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f0f0", borderRadius: "10px" }}>Loading Map...</p>
});

export default function SubmitPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [landmark, setLandmark] = useState("");
  const [image, setImage] = useState<File | null>(null);
  
  // Initial default (India) - will update to current location via useEffect
  const [location, setLocation] = useState<any>({ lat: 20.5937, lng: 78.9629 }); 
  const [isLocating, setIsLocating] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Get current location on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsLocating(false);
        },
        () => setIsLocating(false),
        { enableHighAccuracy: true }
      );
    } else {
      setIsLocating(false);
    }
  }, []);

  const submitIssue = async () => {
    if (!title || !description) return alert("Please fill in Title and Description");
    
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in!");
      setLoading(false);
      return;
    }

    let imageUrl = null;
    if (image) {
      const fileName = `${Date.now()}-${image.name}`;
      const { error: upErr } = await supabase.storage.from("issues-images").upload(fileName, image);
      if (upErr) { console.error(upErr); setLoading(false); return; }
      const { data } = supabase.storage.from("issues-images").getPublicUrl(fileName);
      imageUrl = data.publicUrl;
    }

    const { error } = await supabase.from("issues").insert([{
      title, description, landmark,
      latitude: location.lat,
      longitude: location.lng,
      upvotes: 0,
      image: imageUrl,
      user_id: user.id,
      status: "pending"
    }]);

    if (error) {
      alert("Error submitting");
    } else {
      alert("Submitted successfully!");
      router.push("/");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "auto", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>Report an Issue</h1>
      <p style={{ color: "#666", marginBottom: "20px" }}>Drag the map to position the pin exactly on the issue.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <input placeholder="Problem title" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} style={{...inputStyle, height: "80px"}} />
        <input placeholder="Nearby Landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} style={inputStyle} />
        
        <input type="file" accept="image/*" capture="environment" onChange={(e) => e.target.files && setImage(e.target.files[0])} />

        <div style={{ marginTop: "10px" }}>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>
            Location: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </label>
          
          <div style={{ height: "300px", borderRadius: "12px", overflow: "hidden", border: "2px solid #0070f3" }}>
            {!isLocating ? (
              <MapPicker 
                key="fixed-map" // We use a static key here so the map doesn't unmount while dragging
                initialLocation={location} 
                onChange={(coords: any) => setLocation(coords)} 
              />
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f9f9" }}>
                Detecting your location...
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={submitIssue} 
          disabled={loading} 
          style={{ 
            padding: "15px", 
            backgroundColor: loading ? "#ccc" : "#0070f3", 
            color: "white", 
            border: "none", 
            borderRadius: "8px", 
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "16px"
          }}
        >
          {loading ? "Submitting..." : "Submit Issue"}
        </button>
      </div>
    </div>
  );
}

const inputStyle = { padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px" };