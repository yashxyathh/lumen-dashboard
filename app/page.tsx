"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const [issues, setIssues] = useState<any[]>([]);
  const [sortType, setSortType] = useState("newest");
  const [locationFilter, setLocationFilter] = useState("all");
  const [userLocation, setUserLocation] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); 
  const router = useRouter();

  useEffect(() => {
    getUserInfo();
    fetchIssues();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      });
    }
  }, []);

  async function getUserInfo() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setUserRole(data?.role || 'user');
    }
  }

  async function fetchIssues() {
    const { data, error } = await supabase
      .from("issues")
      .select("*")
      .eq("status", "approved") 
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching issues:", error);
    } else {
      setIssues(data || []);
    }
  }

  async function deleteIssue(issueId: number, ownerId: string) {
    if (currentUserId !== ownerId) {
      alert("You can only delete your own reports!");
      return;
    }

    if (!confirm("Are you sure you want to delete this report? This cannot be undone.")) return;

    const { error } = await supabase.from("issues").delete().eq("id", issueId);

    if (error) {
      alert("Error deleting issue: " + error.message);
    } else {
      alert("Issue deleted successfully.");
      fetchIssues(); 
    }
  }

  async function handleDonate(issueId: number, currentFund: number) {
    if (!currentUserId) {
      alert("Wait! You must be logged in to donate.");
      return;
    }
  
    const amount = prompt("Enter donation amount ($):");
    if (!amount || isNaN(Number(amount))) return;

    const { error } = await supabase
      .from("issues")
      .update({ current_funding: (currentFund || 0) + parseInt(amount) })
      .eq("id", issueId);

    if (error) alert("Donation failed");
    else {
      alert("Thank you for your contribution!");
      fetchIssues(); 
    }
  }

  async function handleUpvote(issueId: number) {
    if (!currentUserId) {
      alert("You must be logged in to upvote!");
      return;
    }

    const { error: logError } = await supabase
      .from("upvotes_log")
      .insert([{ user_id: currentUserId, issue_id: issueId }]);

    if (logError) {
      if (logError.code === '23505') alert("Already upvoted!");
      return;
    }

    const currentIssue = issues.find(i => i.id === issueId);
    const newCount = (currentIssue.upvotes || 0) + 1;

    await supabase.from("issues").update({ upvotes: newCount }).eq("id", issueId);
    setIssues(prev => prev.map(is => is.id === issueId ? { ...is, upvotes: newCount } : is));
  }

  const visibleIssues = issues
    .filter(issue => {
      if (locationFilter === "all") return true;
      if (!userLocation || !issue.latitude || !issue.longitude) return false;
      const dist = Math.sqrt(Math.pow(issue.latitude - userLocation.lat, 2) + Math.pow(issue.longitude - userLocation.lng, 2));
      return dist < 0.02;
    })
    .sort((a, b) => {
      if (sortType === "upvotes") return (b.upvotes || 0) - (a.upvotes || 0);
      return 0;
    });

  return (
    <div style={{ padding: "30px", maxWidth: "800px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1>Civic Issues Feed</h1>

      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <select value={sortType} onChange={(e) => setSortType(e.target.value)} style={{ marginRight: "10px", padding: "5px" }}>
          <option value="newest">Newest</option>
          <option value="upvotes">Most Upvoted</option>
        </select>

        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} style={{ padding: "5px" }}>
          <option value="all">All Locations</option>
          <option value="nearby">Nearby Only</option>
        </select>
      </div>

      {visibleIssues.length === 0 && <p style={{ color: "#666" }}>No approved issues reported yet.</p>}

      {visibleIssues.map((issue) => (
        <div key={issue.id} style={{ border: "1px solid #ccc", padding: "20px", marginTop: "20px", borderRadius: "12px", backgroundColor: "#fff", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
          {issue.image && <img src={issue.image} width="100%" alt="issue" style={{ borderRadius: "8px", maxHeight: "400px", objectFit: "cover" }} />}

          <h2 style={{ marginBottom: "10px" }}>{issue.title}</h2>
          <p style={{ color: "#444" }}>{issue.description}</p>
          <p>📍 <b>Landmark:</b> {issue.landmark}</p>

          <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
            <p><b>Funding Progress:</b></p>
            <div style={{ marginTop: "10px", background: "#ddd", borderRadius: "5px", width: "100%", height: "15px" }}>
              <div style={{ 
                width: `${Math.min(((issue.current_funding || 0) / (issue.funding_goal || 1)) * 100, 100)}%`, 
                background: "#28a745", 
                height: "100%", 
                borderRadius: "5px",
                transition: "width 0.4s ease" 
              }}></div>
            </div>
            <p style={{ fontSize: "14px", margin: "10px 0" }}>
              ${issue.current_funding || 0} raised of ${issue.funding_goal || 0}
            </p>

            <div style={{ marginTop: "15px", display: "flex", gap: "10px", alignItems: "center" }}>
              {(!userRole || userRole === 'user') && issue.current_funding < issue.funding_goal && (
                <button 
                  onClick={() => handleDonate(issue.id, issue.current_funding)}
                  style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
                >
                  💰 Donate
                </button>
              )}

              {userRole === 'contractor' && !issue.assigned_to && (
                <button 
                  onClick={() => router.push('/contractor')}
                  style={{ padding: "10px 20px", backgroundColor: "#0070f3", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
                >
                  🏗️ Apply for Tender
                </button>
              )}

              {issue.assigned_to && issue.status !== 'resolved' && (
                <span style={{ padding: "10px", color: "#f39c12", fontWeight: "bold" }}>🛠️ Work in Progress...</span>
              )}

              {issue.status === 'resolved' && (
                <span style={{ padding: "10px", color: "#27ae60", fontWeight: "bold" }}>✅ Issue Resolved!</span>
              )}
            </div>
          </div>

          <div style={{ marginTop: "15px", borderTop: "1px solid #eee", paddingTop: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <button onClick={() => handleUpvote(issue.id)} style={{ padding: "6px 12px", cursor: "pointer", borderRadius: "6px", border: "1px solid #aaa", background: "white" }}>
                👍 Upvote
              </button>
              <span style={{ marginLeft: "10px", color: "#666" }}>{issue.upvotes || 0} votes</span>
            </div>

            {/* UPDATED: Matches user_id with currentUserId */}
            {currentUserId && issue.user_id === currentUserId && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "12px", color: "#999", fontStyle: "italic" }}>You reported this</span>
                <button 
                  onClick={() => deleteIssue(issue.id, issue.user_id)}
                  style={{ 
                    color: "#dc3545", 
                    background: "none", 
                    border: "1px solid #dc3545", 
                    padding: "5px 12px", 
                    borderRadius: "6px", 
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}