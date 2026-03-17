"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import "./admin.css";

export default function AdminPanel() {
  const [pendingIssues, setPendingIssues] = useState<any[]>([]);
  const [resolvedIssues, setResolvedIssues] = useState<any[]>([]);
  const [approvedIssues, setApprovedIssues] = useState<any[]>([]);
  const [inProgressIssues, setInProgressIssues] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    activeReports: 0,
    totalIssues: 0,
    avgResponseTime: "4.2h",
    citizenRating: 4.9
  });
  const [issuesByCategory, setIssuesByCategory] = useState({
    streetLights: 0,
    potholes: 0,
    other: 0
  });
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
      .order("created_at", { ascending: false });

    if (data) {
      const pending = data.filter(i => i.status === 'pending');
      const approved = data.filter(i => i.status === 'approved');
      const inProgress = data.filter(i => i.status === 'in-progress');
      const resolved = data.filter(i => i.status === 'resolved');

      setPendingIssues(pending);
      setApprovedIssues(approved);
      setInProgressIssues(inProgress);
      setResolvedIssues(resolved);

      // Calculate stats
      setStats(prev => ({
        ...prev,
        activeReports: inProgress.length,
        totalIssues: data.length
      }));

      // Calculate issues by category
      const streetLights = data.filter(i => i.title?.toLowerCase().includes('light') || i.title?.toLowerCase().includes('street')).length;
      const potholes = data.filter(i => i.title?.toLowerCase().includes('pothole') || i.title?.toLowerCase().includes('road')).length;
      const other = data.length - streetLights - potholes;
      
      setIssuesByCategory({
        streetLights,
        potholes,
        other
      });
    }
  }

  async function fetchBids() {
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
    else refreshData();
  }

  async function directApprove(id: number) {
    if (!confirm("This will bypass the donation phase. Continue?")) return;
    const { error } = await supabase
      .from("issues")
      .update({ status: "approved", funding_goal: 1, current_funding: 1 })
      .eq("id", id);

    if (error) alert("Update failed");
    else refreshData();
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

  if (loading) return <div className="loading-container">Verifying Admin Credentials...</div>;
  if (!isAdmin) return null;

  const totalIssuesByCategory = issuesByCategory.streetLights + issuesByCategory.potholes + issuesByCategory.other;
  const streetLightsPercent = totalIssuesByCategory > 0 ? (issuesByCategory.streetLights / totalIssuesByCategory * 100).toFixed(1) : 0;
  const potholesPercent = totalIssuesByCategory > 0 ? (issuesByCategory.potholes / totalIssuesByCategory * 100).toFixed(1) : 0;

  return (
    <div className="admin-container">
      <div className="admin-wrapper">
        {/* Header */}
        <div className="admin-header">
          <h1>Dashboard Overview</h1>
          <p>Welcome back, Admin. Here is what's happening in your area today.</p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-label">Active Reports</div>
            <p className="stat-value">{stats.activeReports}</p>
            <div className="stat-change">⬆ 12% this week</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⚠️</div>
            <div className="stat-label">Reported Issues</div>
            <p className="stat-value">{stats.totalIssues}</p>
            <div className="stat-change">↑ 8 new today</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-label">Avg. Response</div>
            <p className="stat-value">{stats.avgResponseTime}</p>
            <div className="stat-change negative">↑ 18min longer</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-label">Citizen Rating</div>
            <p className="stat-value">{stats.citizenRating}</p>
            <div className="stat-change">↑ 0.2 improvement</div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          {/* Report Volume Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h3 className="chart-title">Report Volume</h3>
                <p className="chart-subtitle">Daily submissions for the last 7 days</p>
              </div>
              <select className="chart-filter">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
            <div className="chart-container">
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '8px', padding: '10px 0' }}>
                {[12, 18, 22, 19, 25, 28, 24].map((height, i) => (
                  <div key={i} style={{
                    width: '12%',
                    height: `${(height / 30) * 100}%`,
                    background: 'linear-gradient(180deg, #0070f3 0%, #0051cc 100%)',
                    borderRadius: '4px 4px 0 0',
                    minHeight: '20px'
                  }} title={`Day ${i + 1}: ${height} reports`} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.75rem', color: '#999', marginTop: '8px' }}>
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </div>
          </div>

          {/* Issues by Category */}
          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h3 className="chart-title">Issues by Category</h3>
                <p className="chart-subtitle">Distribution across issue types</p>
              </div>
            </div>
            <div className="pie-chart">
              <svg width="180" height="180" viewBox="0 0 100 100" style={{ maxWidth: '100%' }}>
                {/* Pie chart segments */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="#0070f3" strokeWidth="8" strokeDasharray={`${2 * Math.PI * 40 * streetLightsPercent / 100} ${2 * Math.PI * 40}`} strokeDashoffset="0" transform="rotate(-90 50 50)" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#ffd700" strokeWidth="8" strokeDasharray={`${2 * Math.PI * 40 * potholesPercent / 100} ${2 * Math.PI * 40}`} strokeDashoffset={`-${2 * Math.PI * 40 * streetLightsPercent / 100}`} transform={`rotate(-90 50 50)`} />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#00d97f" strokeWidth="8" transform="rotate(-90 50 50)" />
              </svg>
            </div>
            <div className="pie-legend">
              <div className="legend-item">
                <div className="legend-color" style={{ background: '#0070f3' }}></div>
                <span className="legend-item-label">Street Lights (40%)</span>
                <span className="legend-item-value">{issuesByCategory.streetLights}</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: '#ffd700' }}></div>
                <span className="legend-item-label">Potholes (30%)</span>
                <span className="legend-item-value">{issuesByCategory.potholes}</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: '#00d97f' }}></div>
                <span className="legend-item-label">Other (30%)</span>
                <span className="legend-item-value">{issuesByCategory.other}</span>
              </div>
            </div>
          </div>
        </div>

        {/* New Issue Reports Section */}
        <div className="admin-section">
          <div className="section-header">
            <span className="section-icon">📋</span>
            <div>
              <h2 className="section-title">New Issue Reports</h2>
              <p className="section-subtitle">Pending review and approval</p>
            </div>
          </div>

          {pendingIssues.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✓</div>
              <p>No new reports. Great work!</p>
            </div>
          ) : (
            pendingIssues.map((issue) => (
              <div key={issue.id} className="issue-card">
                <div className="issue-header">
                  {issue.image && <img src={issue.image} alt="issue" className="issue-image" />}
                  <div className="issue-info">
                    <h3 className="issue-title">{issue.title}</h3>
                    <p className="issue-description">{issue.description}</p>
                    <div className="issue-meta">
                      <span>📍 {issue.landmark}</span>
                      <span>👤 {issue.user_id?.slice(0, 8)}</span>
                      <span>📅 {new Date(issue.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="issue-actions">
                  <button onClick={() => updateIssueStatus(issue.id, 'approved')} className="btn btn-success">
                    ✓ Approve & Set Goal
                  </button>
                  <button onClick={() => directApprove(issue.id)} className="btn btn-primary">
                    ⚡ Direct Approve
                  </button>
                  <button onClick={() => updateIssueStatus(issue.id, 'rejected')} className="btn btn-danger">
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tender Proposals Section */}
        <div className="admin-section">
          <div className="section-header">
            <span className="section-icon">💼</span>
            <div>
              <h2 className="section-title">Incoming Tender Proposals</h2>
              <p className="section-subtitle">Contractor bids awaiting review</p>
            </div>
          </div>

          {bids.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎯</div>
              <p>No contractor bids yet.</p>
            </div>
          ) : (
            bids.map((bid) => (
              <div key={bid.id} className="bid-card">
                <div className="bid-header">
                  <h3 className="bid-title">Project: {bid.issues?.title}</h3>
                  <p className="bid-project">👷 Contractor: <span className="bid-contractor">{bid.profiles?.full_name || "Profile name not set"}</span></p>
                </div>

                <div className="bid-details">
                  <div className="bid-detail-row">
                    <div>
                      <div className="bid-detail-label">📅 Days to Complete</div>
                      <div className="bid-detail-value">{bid.estimated_days} days</div>
                    </div>
                    <div>
                      <div className="bid-detail-label">🧱 Materials Needed</div>
                      <div className="bid-detail-value">{bid.materials_needed}</div>
                    </div>
                  </div>
                  <div className="bid-detail-row full">
                    <div>
                      <div className="bid-detail-label">💼 Experience & Pitch</div>
                      <div className="bid-detail-value">{bid.experience_summary}</div>
                    </div>
                  </div>
                </div>

                <div className="bid-actions">
                  <button 
                    onClick={() => acceptBid(bid.id, bid.issue_id, bid.contractor_id)} 
                    className="btn btn-success btn-full"
                  >
                    ✓ Confirm Contractor & Start Work
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Work Verification Section */}
        <div className="admin-section">
          <div className="section-header">
            <span className="section-icon">✅</span>
            <div>
              <h2 className="section-title">Final Verification</h2>
              <p className="section-subtitle">Resolved jobs awaiting verification</p>
            </div>
          </div>

          {resolvedIssues.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎉</div>
              <p>No jobs waiting for verification.</p>
            </div>
          ) : (
            resolvedIssues.map((issue) => (
              <div key={issue.id} className="resolved-card">
                <div className="resolved-header">
                  <h3 className="resolved-title">{issue.title}</h3>
                  <p className="resolved-status">🛠️ Work Complete by Contractor</p>
                </div>

                {issue.resolved_image && (
                  <>
                    <p style={{ fontSize: '0.9rem', color: '#999', margin: '12px 0 8px 0' }}>📸 Proof of Work</p>
                    <img src={issue.resolved_image} alt="Resolved" className="proof-image" />
                  </>
                )}

                <button 
                  onClick={() => closeIssue(issue.id)} 
                  className="btn btn-success btn-full"
                >
                  ✅ Verify Proof & Close Case
                </button>
              </div>
            ))
          )}
        </div>

        {/* In Progress Section */}
        <div className="admin-section">
          <div className="section-header">
            <span className="section-icon">🛠️</span>
            <div>
              <h2 className="section-title">In Progress Projects</h2>
              <p className="section-subtitle">Currently being worked on by contractors</p>
            </div>
          </div>

          {inProgressIssues.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">⏳</div>
              <p>No projects in progress.</p>
            </div>
          ) : (
            inProgressIssues.map((issue) => (
              <div key={issue.id} className="issue-card">
                <div className="issue-header">
                  {issue.image && <img src={issue.image} alt="issue" className="issue-image" />}
                  <div className="issue-info">
                    <h3 className="issue-title">{issue.title}</h3>
                    <p className="issue-description">{issue.description}</p>
                    <div className="issue-meta">
                      <span>🎯 Status: <strong style={{ color: '#00d97f' }}>In Progress</strong></span>
                      <span>📍 {issue.landmark}</span>
                      <span>📅 {new Date(issue.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
