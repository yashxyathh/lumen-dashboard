"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ContractorPage() {
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [myBids, setMyBids] = useState<any[]>([]); // Added state for withdrawable bids
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Tender Form State
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [days, setDays] = useState("");
  const [materials, setMaterials] = useState("");
  const [experience, setExperience] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // 1. Fetch Available Tenders (Approved & Unassigned)
    const { data: available, error: availableError } = await supabase
      .from("issues")
      .select("*")
      .eq("status", "approved")
      .is("assigned_to", null);

    if (availableError) console.error("Error fetching available:", availableError);
    setAvailableJobs(available || []);

    // 2. Fetch Active Jobs assigned to this contractor
    const { data: active, error: activeError } = await supabase
      .from("issues")
      .select("*")
      .eq("assigned_to", user.id);
    
    if (activeError) console.error("Error fetching active:", activeError);
    setMyJobs(active || []);

    // 3. Fetch Pending Bids (for the Withdraw functionality)
    const { data: bids, error: bidsError } = await supabase
      .from("contractor_bids")
      .select("*, issues(title)")
      .eq("contractor_id", user.id)
      .eq("bid_status", "pending");

    if (bidsError) console.error("Error fetching bids:", bidsError);
    setMyBids(bids || []);
    
    setLoading(false);
  }

  async function submitTender(issueId: number) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("contractor_bids")
      .insert([{
        issue_id: issueId,
        contractor_id: user?.id,
        estimated_days: parseInt(days),
        materials_needed: materials,
        experience_summary: experience,
        bid_status: 'pending'
      }]);

    if (error) {
      alert("Error submitting tender: " + error.message);
    } else {
      alert("Proposal submitted! The Admin will review your tender.");
      setSelectedIssue(null);
      setDays("");
      setMaterials("");
      setExperience("");
      fetchData(); // Refresh all lists
    }
  }

  // NEW: Withdraw Bid function
  async function withdrawBid(bidId: number) {
    if (!confirm("Withdraw this tender proposal?")) return;

    const { error } = await supabase
      .from("contractor_bids")
      .delete()
      .eq("id", bidId);

    if (error) {
      alert("Error withdrawing bid");
    } else {
      alert("Bid withdrawn successfully");
      fetchData(); 
    }
  }

  async function handleResolutionUpload(e: any, issueId: number) {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = `resolved-${Date.now()}-${file.name}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("issues-images")
      .upload(fileName, file);

    if (uploadError) {
      alert("Upload failed");
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from("issues-images")
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from("issues")
      .update({ 
        status: "resolved",
        resolved_image: publicUrl.publicUrl
      })
      .eq("id", issueId);

    if (updateError) alert("Error updating status");
    else {
      alert("Proof of work submitted! Status is now RESOLVED.");
      fetchData();
    }
  }

  if (loading) return <div style={{padding: "50px"}}>Loading Contractor Portal...</div>;

  return (
    <div style={{ padding: "30px", maxWidth: "1000px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1>Contractor Portal</h1>
      <hr />
      
      {/* SECTION 1: AVAILABLE TENDERS */}
      <section style={{ marginBottom: "50px" }}>
        <h2 style={{ color: "#0070f3" }}>🏗️ Available Tenders</h2>
        <div style={{ display: "grid", gap: "20px" }}>
          {availableJobs.length === 0 && <p>No new approved jobs currently available.</p>}
          {availableJobs.map(job => (
            <div key={job.id} style={{ border: "1px solid #ccc", padding: "20px", borderRadius: "8px" }}>
              <h3>{job.title}</h3>
              <p>{job.description}</p>
              <p><b>Funding: ${job.current_funding} / ${job.funding_goal}</b></p>
              
              <button 
                onClick={() => setSelectedIssue(job)} 
                style={{ backgroundColor: "#0070f3", color: "white", padding: "10px", border: "none", borderRadius: "5px", cursor: "pointer" }}
              >
                Apply for Tender
              </button>

              {selectedIssue?.id === job.id && (
                <div style={{ marginTop: "20px", background: "#f9f9f9", padding: "20px", border: "1px solid #0070f3", borderRadius: "8px" }}>
                  <h4>Submit Your Proposal</h4>
                  <label>Days to complete:</label>
                  <input type="number" value={days} onChange={e => setDays(e.target.value)} style={{display: "block", width: "100%", padding: "8px", marginBottom: "10px"}} />
                  
                  <label>Materials needed:</label>
                  <textarea value={materials} onChange={e => setMaterials(e.target.value)} style={{display: "block", width: "100%", padding: "8px", marginBottom: "10px"}} />
                  
                  <label>Why should we hire you? (Experience):</label>
                  <textarea value={experience} onChange={e => setExperience(e.target.value)} style={{display: "block", width: "100%", padding: "8px", marginBottom: "10px"}} />
                  
                  <button onClick={() => submitTender(job.id)} style={{backgroundColor: "green", color: "white", padding: "10px 20px", border: "none", borderRadius: "5px", cursor: "pointer"}}>
                    Send Tender Proposal
                  </button>
                  <button onClick={() => setSelectedIssue(null)} style={{marginLeft: "10px", background: "none", border: "none", color: "red", cursor: "pointer"}}>Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: PENDING PROPOSALS (WITHDRAW OPTION) */}
      <section style={{ marginBottom: "50px" }}>
        <h2 style={{ color: "#f39c12" }}>📑 My Pending Proposals</h2>
        <div style={{ display: "grid", gap: "15px" }}>
          {myBids.length === 0 && <p style={{ color: "#777" }}>No pending bids.</p>}
          {myBids.map(bid => (
            <div key={bid.id} style={{ border: "1px solid #f39c12", padding: "15px", borderRadius: "8px", backgroundColor: "#fffcf5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: 0 }}><b>Project:</b> {bid.issues?.title}</p>
                <span style={{ fontSize: "12px", color: "#f39c12" }}>Status: Pending Admin Review</span>
              </div>
              <button 
                onClick={() => withdrawBid(bid.id)}
                style={{ color: "red", border: "1px solid red", background: "white", padding: "6px 12px", borderRadius: "4px", cursor: "pointer" }}
              >
                🚫 Withdraw
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: ACTIVE JOBS */}
      <section>
        <h2 style={{ color: "#28a745" }}>🛠️ My Active Repairs</h2>
        <div style={{ display: "grid", gap: "20px" }}>
          {myJobs.length === 0 && <p>You have no active projects.</p>}
          {myJobs.map(job => (
            <div key={job.id} style={{ border: "2px solid #28a745", padding: "20px", borderRadius: "8px" }}>
              <h3>{job.title}</h3>
              <p>Current Status: <b style={{color: "#28a745"}}>{job.status.toUpperCase()}</b></p>
              
              {job.status === 'in-progress' && (
                <div style={{ marginTop: "15px", padding: "10px", border: "1px dashed #28a745" }}>
                  <p><b>Finish Job:</b> Upload "After" photo to request payment</p>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleResolutionUpload(e, job.id)} 
                  />
                </div>
              )}
              {job.status === 'resolved' && <p>✅ Job complete. Admin is verifying for payment release.</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
