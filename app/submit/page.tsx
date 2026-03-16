"use client";

import { useState } from "react";

export default function SubmitPage() {

  const [title,setTitle]=useState("");
  const [description,setDescription]=useState("");
  const [landmark,setLandmark]=useState("");
  const [image,setImage]=useState<File | null>(null);
  const [location,setLocation]=useState<any>(null);

  const captureLocation=()=>{
    if(!navigator.geolocation){
      alert("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition((position)=>{
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      })
    });
  };

  const submitIssue = () => {
    const newIssue = {
        title,
        description,
        landmark,
        location,
        image: image ? URL.createObjectURL(image) : null
    };
    
    const existing = localStorage.getItem("issues");
    
    let issues = [];
    
    if(existing){
        issues = JSON.parse(existing);
    }
    
    issues.push(newIssue);
    
    localStorage.setItem("issues", JSON.stringify(issues));
    
    alert("Issue submitted successfully!");};

  return (

    <div style={{padding:"30px"}}>

      <h1>Report an Issue</h1>

      <br/>

      <input
      placeholder="Problem title"
      value={title}
      onChange={(e)=>setTitle(e.target.value)}
      style={{padding:"10px",width:"300px"}}
      />

      <br/><br/>

      <textarea
      placeholder="Describe the issue"
      value={description}
      onChange={(e)=>setDescription(e.target.value)}
      style={{padding:"10px",width:"300px",height:"120px"}}
      />

      <br/><br/>
      <input
      placeholder="Landmark"
      value={landmark}
      onChange={(e)=>setLandmark(e.target.value)}
      style={{padding:"10px",width:"300px"}}
      />

      <br/><br/>

      <input
      type="file"
      accept="image/*"
      capture="environment"
      onChange={(e)=>{
        if(e.target.files){
          setImage(e.target.files[0]);
        }
      }}
      />

      <br/><br/>

      <button onClick={captureLocation}>
        Capture Location
      </button>

      {location && (
        <p>
          Location captured: {location.lat.toFixed(4)} , {location.lng.toFixed(4)}
        </p>
      )}

      <br/>

      <button onClick={submitIssue}>
        Submit Issue
      </button>

    </div>

  );
}