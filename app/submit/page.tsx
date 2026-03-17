"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation"; // Added for redirection

export default function SubmitPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [landmark, setLandmark] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(false); // Added loading state
  const router = useRouter();

  const captureLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      })
    });
  };

  const submitIssue = async () => {
    setLoading(true);

    // --- NEW: CHECK IF USER IS LOGGED IN ---
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in to report an issue!");
      setLoading(false);
      return;
    }

    let imageUrl = null;

    if (image) {
      const fileName = Date.now() + "-" + image.name;
      const { error: uploadError } = await supabase.storage
        .from("issues-images")
        .upload(fileName, image);

      if (uploadError) {
        console.error(uploadError);
        alert("Image upload failed");
        setLoading(false);
        return;
      }

      const { data } = supabase.storage
        .from("issues-images")
        .getPublicUrl(fileName);

      imageUrl = data.publicUrl;
    }

    // --- UPDATED: ADD USER_ID AND STATUS ---
    const { error } = await supabase
      .from("issues")
      .insert([
        {
          title: title,
          description: description,
          landmark: landmark,
          latitude: location?.lat,
          longitude: location?.lng,
          upvotes: 0,
          image: imageUrl,
          user_id: user.id,      // Links issue to the person who reported it
          status: "pending"      // Starts as pending for Admin approval
        }
      ]);

    if (error) {
      console.error("FULL ERROR DETAILS:", JSON.stringify(error, null, 2));
      alert("Error submitting issue");
    } else {
      alert("Issue submitted! It will appear on the feed once an Admin approves it.");
      router.push("/"); // Redirect back to home
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "30px" }}>
      <h1>Report an Issue</h1>
      <p style={{ color: "gray" }}>Your report will be reviewed by an Admin before appearing publicly.</p>

      <br />

      <input
        placeholder="Problem title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ padding: "10px", width: "300px" }}
      />

      <br /><br />

      <textarea
        placeholder="Describe the issue"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ padding: "10px", width: "300px", height: "120px" }}
      />

      <br /><br />
      <input
        placeholder="Landmark"
        value={landmark}
        onChange={(e) => setLandmark(e.target.value)}
        style={{ padding: "10px", width: "300px" }}
      />

      <br /><br />

      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          if (e.target.files) {
            setImage(e.target.files[0]);
          }
        }}
      />

      <br /><br />

      <button onClick={captureLocation}>
        Capture Location
      </button>

      {location && (
        <p>
          Location captured: {location.lat.toFixed(4)} , {location.lng.toFixed(4)}
        </p>
      )}

      <br />

      <button 
        onClick={submitIssue} 
        disabled={loading}
        style={{ 
          padding: "10px 20px", 
          backgroundColor: loading ? "#ccc" : "#0070f3", 
          color: "white", 
          border: "none", 
          borderRadius: "5px",
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        {loading ? "Submitting..." : "Submit Issue"}
      </button>

    </div>
  );
}