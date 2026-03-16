"use client";

import { useEffect, useState } from "react";

export default function Home() {

  const [issues,setIssues]=useState<any[]>([]);
  const [sortType,setSortType]=useState("newest");
  const [locationFilter,setLocationFilter]=useState("all");
  const [userLocation,setUserLocation]=useState<any>(null);

  useEffect(()=>{

    const stored = localStorage.getItem("issues");

    if(stored){
      setIssues(JSON.parse(stored));
    }

    navigator.geolocation.getCurrentPosition((pos)=>{
      setUserLocation({
        lat:pos.coords.latitude,
        lng:pos.coords.longitude
      });
    });

  },[]);

  function handleUpvote(index:number){
    
    const updatedIssues = [...issues];
    
    if(!updatedIssues[index].upvotes){
      updatedIssues[index].upvotes = 0;
    }
    
    updatedIssues[index].upvotes += 1;
    
    setIssues(updatedIssues);
    
    localStorage.setItem("issues", JSON.stringify(updatedIssues));
  }

  return (

    <div style={{padding:"30px"}}>

      <h1>Civic Issues Feed</h1>

      <div style={{marginTop:"20px",marginBottom:"20px"}}>
        <select
        value={sortType}
        onChange={(e)=>setSortType(e.target.value)}
        style={{marginRight:"10px"}}
        >
        <option value="newest">Newest</option>
        <option value="upvotes">Most Upvoted</option>
        </select>
        
        <select
        value={locationFilter}
        onChange={(e)=>setLocationFilter(e.target.value)}
        >
        <option value="all">All</option>
        <option value="nearby">Nearby</option>
        </select>
      </div>

      {issues.length===0 && (
        <p>No issues reported yet</p>
      )}

      {issues.map((issue,index)=>(
        <div key={index}
        style={{
          border:"1px solid #ccc",
          padding:"15px",
          marginTop:"20px",
          borderRadius:"8px"
        }}>

          {issue.image && (
            <img src={issue.image} width="200"/>
          )}

          <h2>{issue.title}</h2>

          <p>{issue.description}</p>

          <p><b>Landmark:</b> {issue.landmark}</p>

          <div style={{marginTop:"10px"}}>
            <button
            onClick={()=>handleUpvote(index)}
            style={{
              padding:"6px 12px",
              cursor:"pointer",
              borderRadius:"6px",
              border:"1px solid #aaa"
            }}
            >
              👍 Upvote
            </button>
            
            <span style={{marginLeft:"10px"}}>
              {issue.upvotes || 0} votes
              </span>
          </div>

          {issue.location && (
            <p>
              <b>Location:</b> {issue.location.lat.toFixed(4)} ,
              {issue.location.lng.toFixed(4)}
            </p>
          )}

        </div>
      ))}

    </div>

  );
}