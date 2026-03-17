"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function MyReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchMyReports();
  }, []);

  async function fetchMyReports() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("issues")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    else setReports(data || []);
    setLoading(false);
  }

  // Helper to color-code the status
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return { color: "#f39c12", bg: "#fff7e6", label: "⏳ Pending Admin Approval" };
      case 'approved': return { color: "#0070f3", bg: "#e6f0ff", label: "✅ Approved (Funding Open)" };
      case 'in-progress': return { color: "#9b59b6", bg: "#f5eef8", label: "🛠️ Contractor Working" };
      case 'resolved': return { color: "#27ae60", bg: "#ebf5ee", label: "📸 Finished (Wait for Admin)" };
      case 'closed': return { color: "#7f8c8d", bg: "#f2f2f2", label: "🏁 Case Closed & Paid" };
      case 'rejected': return { color: "#e74c3c", bg: "#fdedec", label: "❌ Rejected" };
      default: return { color: "#333", bg: "#eee", label: status };
    }
  };

  if (loading) return <div style={{ padding: "50px" }}>Loading your reports...</div>;

  return (
    <div style={{ padding: "30px", maxWidth: "800px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ borderBottom: "2px solid #333", paddingBottom: "10px" }}>My Reported Issues</h1>

      {reports.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
          <p>You haven't reported any issues yet.</p>
          <button onClick={() => router.push("/submit")} style={btnSubmit}>Report an Issue</button>
        </div>
      ) : (
        reports.map((issue) => {
          const status = getStatusStyle(issue.status);
          return (
            <div key={issue.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: "0 0 5px 0" }}>{issue.title}</h3>
                  <p style={{ fontSize: "14px", color: "#666" }}>Reported on: {new Date(issue.created_at).toLocaleDateString()}</p>
                </div>
                <span style={{ 
                  padding: "5px 12px", 
                  borderRadius: "20px", 
                  fontSize: "12px", 
                  fontWeight: "bold", 
                  color: status.color, 
                  backgroundColor: status.bg,
                  border: `1px solid ${status.color}`
                }}>
                  {status.label}
                </span>
              </div>

              <p style={{ marginTop: "15px", color: "#444" }}>{issue.description}</p>
              
              {/* Progress Bar for the user to see how close to repair it is */}
              {issue.status === 'approved' && (
                <div style={{ marginTop: "15px" }}>
                  <p style={{ fontSize: "12px", marginBottom: "5px" }}><b>Funding Progress:</b></p>
                  <div style={{ background: "#ddd", height: "10px", borderRadius: "5px" }}>
                    <div style={{ 
                      width: `${(issue.current_funding / issue.funding_goal) * 100}%`, 
                      background: "#28a745", 
                      height: "100%", 
                      borderRadius: "5px" 
                    }} />
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

const cardStyle = {
  border: "1px solid #ddd",
  borderRadius: "12px",
  padding: "20px",
  marginBottom: "20px",
  backgroundColor: "#fff",
  boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
};

const btnSubmit = {
  backgroundColor: "#0070f3",
  color: "white",
  padding: "10px 20px",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  marginTop: "10px"
};