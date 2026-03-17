"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AdminPanel() {
  const [pendingIssues, setPendingIssues] = useState<any[]>([]);
  const [resolvedIssues, setResolvedIssues] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkUserRole();
  }, []);

  async function checkUserRole() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") {
      setIsAdmin(true);
      refreshData();
    } else {
      alert("Unauthorized! Admin access only.");
      router.push("/");
    }
    setLoading(false);
  }

  async function refreshData() {
    await Promise.all([fetchIssuesByStatus(), fetchBids()]);
  }

  async function fetchIssuesByStatus() {
    const { data } = await supabase
      .from("issues")
      .select("*")
      .in("status", ["pending", "resolved"])
      .order("created_at", { ascending: false });

    if (data) {
      setPendingIssues(data.filter(i => i.status === 'pending'));
      setResolvedIssues(data.filter(i => i.status === 'resolved'));
    }
  }

  async function fetchBids() {
    // Removed !inner to prevent bids from disappearing if profile/issue links are soft
    const { data, error } = await supabase
      .from("contractor_bids")
      .select(`
        *,
        issues ( title ),
        profiles ( full_name )
      `)
      .eq("bid_status", "pending");

    if (error) console.error("Error fetching bids:", error.message);
    else setBids(data || []);
  }

  async function updateIssueStatus(id: number, newStatus: string) {
    let goal = 0;
    if (newStatus === 'approved') {
      const input = prompt("Set a Funding Goal (Budget) in $:", "500");
      if (input === null) return;
      goal = parseInt(input);
    }

    const { error } = await supabase
      .from("issues")
      .update({ status: newStatus, funding_goal: goal })
      .eq("id", id);

    if (error) alert("Update failed");
    else fetchIssuesByStatus();
  }

  async function directApprove(id: number) {
    if (!confirm("This will bypass the donation phase. Continue?")) return;
    const { error } = await supabase
      .from("issues")
      .update({ status: "approved", funding_goal: 1, current_funding: 1 })
      .eq("id", id);

    if (error) alert("Update failed");
    else fetchIssuesByStatus();
  }

  async function acceptBid(bidId: number, issueId: number, contractorId: string) {
    if (!confirm("Assign this contractor and start the repair?")) return;
    await supabase.from("contractor_bids").update({ bid_status: 'accepted' }).eq("id", bidId);
    await supabase.from("contractor_bids").update({ bid_status: 'rejected' }).eq("issue_id", issueId).neq("id", bidId);
    
    const { error } = await supabase
      .from("issues")
      .update({ assigned_to: contractorId, status: 'in-progress' })
      .eq("id", issueId);

    if (error) alert("Error assigning contractor");
    else {
      alert("Contractor Assigned!");
      refreshData();
    }
  }

  async function closeIssue(issueId: number) {
    if (!confirm("Verify proof of work and close this case?")) return;
    
    const { error } = await supabase
      .from("issues")
      .update({ status: "closed" })
      .eq("id", issueId);

    if (error) {
      console.error("Full Error Object:", error);
      alert(`Error: ${error.message} (Code: ${error.code})`);
    } else {
      alert("Issue Verified & Closed!");
      refreshData();
    }
  }

  if (loading) return <div style={{ padding: "50px" }}>Verifying Admin Credentials...</div>;
  if (!isAdmin) return null;

  return (
    <div style={{ padding: "40px", maxWidth: "1000px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ borderBottom: "2px solid #333", paddingBottom: "10px" }}>Admin Dashboard</h1>

      {/* SECTION 1: NEW SUBMISSIONS */}
      <section style={{ marginTop: "40px" }}>
        <h2 style={{ color: "#444" }}>1. New Issue Reports</h2>
        {pendingIssues.length === 0 ? <p style={{ color: "#888" }}>No new reports.</p> : (
          pendingIssues.map((issue) => (
            <div key={issue.id} style={cardStyle}>
              {issue.image && <img src={issue.image} alt="issue" style={imageStyle} />}
              <div style={{ flex: 1 }}>
                <h3>{issue.title}</h3>
                <p>{issue.description}</p>
                <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                  <button onClick={() => updateIssueStatus(issue.id, 'approved')} style={btnSuccess}>Approve & Goal</button>
                  <button onClick={() => directApprove(issue.id)} style={btnPrimary}>Direct Approve</button>
                  <button onClick={() => updateIssueStatus(issue.id, 'rejected')} style={btnDanger}>Reject</button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      <hr style={{ margin: "50px 0" }} />

      {/* SECTION 2: TENDER PROPOSALS (UPDATED DETAILED VIEW) */}
      <section>
        <h2 style={{ color: "#0070f3" }}>2. Incoming Tender Proposals</h2>
        {bids.length === 0 ? <p style={{ color: "#888" }}>No contractor bids yet.</p> : (
          bids.map((bid) => (
            <div key={bid.id} style={{ ...cardStyle, border: "2px solid #0070f3", backgroundColor: "#f0f7ff", flexDirection: 'column' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 10px 0" }}>Project: {bid.issues?.title}</h3>
                
                <div style={{ background: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #cce3ff" }}>
                  <p style={{ margin: "0 0 10px 0", fontSize: "1.1rem" }}>
                    👷 <b>Contractor:</b> {bid.profiles?.full_name || "Name not set in profile"} 
                    <span style={{fontSize: '11px', color: '#666', marginLeft: '10px'}}>({bid.contractor_id})</span>
                  </p>
                  
                  <hr style={{ border: "0", borderTop: "1px solid #eee", margin: "10px 0" }} />
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <p>📅 <b>Days to complete:</b> {bid.estimated_days}</p>
                    <p>🧱 <b>Materials:</b> {bid.materials_needed}</p>
                    <p style={{ gridColumn: "span 2" }}>💼 <b>Experience/Pitch:</b> {bid.experience_summary}</p>
                  </div>
                </div>

                <button 
                  onClick={() => acceptBid(bid.id, bid.issue_id, bid.contractor_id)} 
                  style={{ ...btnPrimary, width: "100%", marginTop: "15px", padding: "12px" }}
                >
                  Confirm Contractor & Start Work
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <hr style={{ margin: "50px 0" }} />

      {/* SECTION 3: WORK VERIFICATION */}
      <section>
        <h2 style={{ color: "#27ae60" }}>3. Final Verification (Resolved Jobs)</h2>
        {resolvedIssues.length === 0 ? <p style={{ color: "#888" }}>No jobs waiting for verification.</p> : (
          resolvedIssues.map((issue) => (
            <div key={issue.id} style={{ ...cardStyle, border: "2px solid #27ae60", backgroundColor: "#f0fff4" }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>{issue.title}</h3>
                <p style={{ color: "#27ae60", fontWeight: "bold" }}>🛠️ Work Complete by Contractor</p>
                
                {issue.resolved_image && (
                  <div style={{ marginTop: "10px" }}>
                    <p><b>Proof of Work (After Photo):</b></p>
                    <img src={issue.resolved_image} alt="Resolved" style={{ width: "100%", maxHeight: "300px", objectFit: "cover", borderRadius: "8px" }} />
                  </div>
                )}

                <button 
                  onClick={() => closeIssue(issue.id)} 
                  style={{ ...btnSuccess, width: "100%", marginTop: "15px", backgroundColor: "#27ae60" }}
                >
                  ✅ Verify Proof & Close Case
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

const cardStyle = { border: "1px solid #ddd", borderRadius: "12px", padding: "20px", marginBottom: "20px", display: "flex", gap: "20px", backgroundColor: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" };
const imageStyle = { width: "180px", height: "140px", objectFit: "cover" as "cover", borderRadius: "8px" };
const btnSuccess = { background: "#28a745", color: "white", border: "none", padding: "10px 15px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" };
const btnPrimary = { background: "#0070f3", color: "white", border: "none", padding: "10px 15px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" };
const btnDanger = { background: "#dc3545", color: "white", border: "none", padding: "10px 15px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" };