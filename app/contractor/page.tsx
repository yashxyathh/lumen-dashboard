"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { auditFix } from "@/app/actions/audit"; // Import the Server Action

export default function ContractorPage() {
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [myBids, setMyBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuditing, setIsAuditing] = useState<number | null>(null); // Tracking AI progress
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

    // 1. Fetch Available Tenders
    const { data: available } = await supabase
      .from("issues")
      .select("*")
      .eq("status", "approved")
      .is("assigned_to", null);

    setAvailableJobs(available || []);

    // 2. Fetch Active Jobs assigned to this contractor
    const { data: active } = await supabase
      .from("issues")
      .select("*")
      .eq("assigned_to", user.id);
    
    setMyJobs(active || []);

    // 3. Fetch Pending Bids
    const { data: bids } = await supabase
      .from("contractor_bids")
      .select("*, issues(title)")
      .eq("contractor_id", user.id)
      .eq("bid_status", "pending");

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
      alert("Error: " + error.message);
    } else {
      alert("Proposal submitted!");
      setSelectedIssue(null);
      setDays("");
      setMaterials("");
      setExperience("");
      fetchData();
    }
  }

  async function withdrawBid(bidId: number) {
    if (!confirm("Withdraw this tender proposal?")) return;
    const { error } = await supabase.from("contractor_bids").delete().eq("id", bidId);
    if (!error) fetchData();
  }

  // UPDATED: handleResolutionUpload with AI Verification
  async function handleResolutionUpload(e: any, job: any) {
    const file = e.target.files[0];
    if (!file) return;

    setIsAuditing(job.id);

    try {
      // 1. Upload "After" photo to Storage
      const fileName = `resolved-${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("issues-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("issues-images")
        .getPublicUrl(fileName);

      const afterUrl = publicUrl.publicUrl;

      // 2. Call the AI Auditor
      // We pass the original user image (job.image) and the new afterUrl
      const auditResult = await auditFix(job.image, afterUrl);

      // 3. Update the Issue in DB
      const { error: updateError } = await supabase
        .from("issues")
        .update({ 
          status: "resolved",
          resolved_image: afterUrl,
          ai_score: auditResult.confidence || 0,
          ai_summary: auditResult.reason || "No summary provided"
        })
        .eq("id", job.id);

      if (updateError) throw updateError;

      if (auditResult.resolved && auditResult.confidence > 80) {
        alert(`✅ AI Audit Success: ${auditResult.reason}`);
      } else {
        alert(`⚠️ AI Flagged for Review: ${auditResult.reason}`);
      }

      fetchData();
    } catch (err: any) {
      console.error(err);
      alert("Audit/Upload failed: " + err.message);
    } finally {
      setIsAuditing(null);
    }
  }

  if (loading) return <div style={{padding: "50px", textAlign: "center"}}>Loading Contractor Portal...</div>;

  return (
    <div style={{ padding: "30px", maxWidth: "1000px", margin: "0 auto", fontFamily: "sans-serif", color: "#333" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h1>Contractor Portal</h1>
        <button onClick={() => router.push('/')} style={{ background: "#eee", border: "none", padding: "8px 15px", borderRadius: "5px", cursor: "pointer" }}>Back to Site</button>
      </header>
      
      <hr style={{ border: "0.5px solid #eee", marginBottom: "40px" }} />
      
      {/* SECTION 1: AVAILABLE TENDERS */}
      <section style={{ marginBottom: "50px" }}>
        <h2 style={{ color: "#0070f3", display: "flex", alignItems: "center", gap: "10px" }}>🏗️ Available Tenders</h2>
        <div style={{ display: "grid", gap: "20px" }}>
          {availableJobs.length === 0 && <p style={{ color: "#888" }}>No new approved jobs currently available.</p>}
          {availableJobs.map(job => (
            <div key={job.id} style={{ border: "1px solid #eaeaea", padding: "20px", borderRadius: "12px", backgroundColor: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", gap: "20px" }}>
                {job.image && <img src={job.image} alt="issue" style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "8px" }} />}
                <div>
                   <h3 style={{ marginTop: 0 }}>{job.title}</h3>
                   <p style={{ color: "#666" }}>{job.description}</p>
                   <p><b>Funding: ${job.current_funding} / ${job.funding_goal}</b></p>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedIssue(job)} 
                style={{ backgroundColor: "#0070f3", color: "white", padding: "10px 20px", border: "none", borderRadius: "6px", cursor: "pointer", marginTop: "15px", fontWeight: "bold" }}
              >
                Apply for Tender
              </button>

              {selectedIssue?.id === job.id && (
                <div style={{ marginTop: "20px", background: "#f0f7ff", padding: "20px", border: "1px solid #0070f3", borderRadius: "8px" }}>
                  <h4 style={{ marginTop: 0 }}>Submit Your Proposal</h4>
                  <div style={{ display: "grid", gap: "10px" }}>
                    <div>
                      <label style={{ fontSize: "14px", fontWeight: "bold" }}>Days to complete:</label>
                      <input type="number" value={days} onChange={e => setDays(e.target.value)} placeholder="e.g. 5" style={{display: "block", width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc", marginTop: "5px"}} />
                    </div>
                    <div>
                      <label style={{ fontSize: "14px", fontWeight: "bold" }}>Materials needed:</label>
                      <textarea value={materials} onChange={e => setMaterials(e.target.value)} placeholder="List materials..." style={{display: "block", width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc", marginTop: "5px", minHeight: "60px"}} />
                    </div>
                    <div>
                      <label style={{ fontSize: "14px", fontWeight: "bold" }}>Your Experience:</label>
                      <textarea value={experience} onChange={e => setExperience(e.target.value)} placeholder="Tell us why you're a good fit..." style={{display: "block", width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc", marginTop: "5px", minHeight: "80px"}} />
                    </div>
                  </div>
                  
                  <div style={{ marginTop: "15px" }}>
                    <button onClick={() => submitTender(job.id)} style={{backgroundColor: "#28a745", color: "white", padding: "10px 20px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold"}}>
                      Send Tender Proposal
                    </button>
                    <button onClick={() => setSelectedIssue(null)} style={{marginLeft: "15px", background: "none", border: "none", color: "#ff4d4f", cursor: "pointer", fontWeight: "bold"}}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: PENDING PROPOSALS */}
      <section style={{ marginBottom: "50px" }}>
        <h2 style={{ color: "#f39c12", display: "flex", alignItems: "center", gap: "10px" }}>📑 My Pending Proposals</h2>
        <div style={{ display: "grid", gap: "15px" }}>
          {myBids.length === 0 && <p style={{ color: "#888" }}>No pending bids.</p>}
          {myBids.map(bid => (
            <div key={bid.id} style={{ border: "1px solid #ffe58f", padding: "15px", borderRadius: "10px", backgroundColor: "#fffbe6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: 0, fontWeight: "bold" }}>Project: {bid.issues?.title}</p>
                <span style={{ fontSize: "13px", color: "#d48806" }}>Status: Pending Admin Review</span>
              </div>
              <button 
                onClick={() => withdrawBid(bid.id)}
                style={{ color: "#ff4d4f", border: "1px solid #ff4d4f", background: "white", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}
              >
                🚫 Withdraw
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: ACTIVE REPAIRS */}
      <section>
        <h2 style={{ color: "#28a745", display: "flex", alignItems: "center", gap: "10px" }}>🛠️ My Active Repairs</h2>
        <div style={{ display: "grid", gap: "20px" }}>
          {myJobs.length === 0 && <p style={{ color: "#888" }}>You have no active projects.</p>}
          {myJobs.map(job => (
            <div key={job.id} style={{ border: "2px solid #e6f7ff", padding: "20px", borderRadius: "12px", backgroundColor: "#f0faff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ marginTop: 0 }}>{job.title}</h3>
                  <p>Status: <b style={{ color: "#0070f3", textTransform: "uppercase" }}>{job.status}</b></p>
                </div>
                {job.image && <img src={job.image} alt="before" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", border: "2px solid #fff" }} />}
              </div>
              
              {job.status === 'in-progress' && (
                <div style={{ marginTop: "20px", padding: "20px", background: "white", borderRadius: "8px", border: "1px dashed #0070f3" }}>
                  <p style={{ marginTop: 0 }}><b>Complete Repair:</b> Please upload the "After" photo. Our AI will verify the fix against the original report.</p>
                  
                  {isAuditing === job.id ? (
                    <div style={{ padding: "10px", textAlign: "center", color: "#0070f3", fontWeight: "bold" }}>
                      🧠 AI is analyzing your work... Please wait...
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleResolutionUpload(e, job)} 
                        style={{ fontSize: "14px" }}
                      />
                    </div>
                  )}
                </div>
              )}

              {job.status === 'resolved' && (
                <div style={{ marginTop: "15px", color: "#28a745", fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px" }}>
                  ✅ Job submitted for final verification. 
                  {job.ai_score && <span style={{ fontSize: "12px", color: "#666", fontWeight: "normal" }}>(AI Score: {job.ai_score}%)</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
