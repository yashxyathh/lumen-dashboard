"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import "./home.css";

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
    <div className="home-container">
      <h1 className="feed-title">Civic Issues Feed</h1>

      <div className="filter-section">
        <select value={sortType} onChange={(e) => setSortType(e.target.value)} className="filter-dropdown">
          <option value="newest">Newest</option>
          <option value="upvotes">Most Upvoted</option>
        </select>

        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="filter-dropdown">
          <option value="all">All Locations</option>
          <option value="nearby">Nearby Only</option>
        </select>
      </div>

      {visibleIssues.length === 0 && <p className="empty-state">No approved issues reported yet.</p>}

      {visibleIssues.map((issue) => (
        <div key={issue.id} className="issue-card">
          <div className="issue-content-wrapper">
            {issue.image && (
              <div className="issue-image-container">
                <img src={issue.image} alt="issue" className="issue-image" />
              </div>
            )}

            <div className="issue-details">
              <div className="issue-header">
                <h2 className="issue-title">{issue.title}</h2>
                <p className="issue-landmark">📍 {issue.landmark}</p>
              </div>

              <p className="issue-description">{issue.description}</p>

              <div className="funding-section">
                <div className="funding-header">
                  <span className="funding-label">Funding Progress</span>
                  <span className="funding-amount">
                    ${issue.current_funding || 0} / ${issue.funding_goal || 0}
                  </span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{
                    width: `${Math.min(((issue.current_funding || 0) / (issue.funding_goal || 1)) * 100, 100)}%`
                  }}></div>
                </div>
              </div>

              <div className="issue-footer">
                <div className="footer-left">
                  <button onClick={() => handleUpvote(issue.id)} className="btn-upvote">
                    👍 Upvote
                  </button>
                  <span className="vote-count">{issue.upvotes || 0} votes</span>
                </div>

                <div className="action-buttons">
                  {(!userRole || userRole === 'user') && issue.current_funding < issue.funding_goal && (
                    <button
                      onClick={() => handleDonate(issue.id, issue.current_funding)}
                      className="btn-donate"
                    >
                      💰 Donate
                    </button>
                  )}

                  {userRole === 'contractor' && !issue.assigned_to && (
                    <button
                      onClick={() => router.push('/contractor')}
                      className="btn-tender"
                    >
                      🏗️ Apply
                    </button>
                  )}

                  {issue.assigned_to && issue.status !== 'resolved' && (
                    <span className="status-in-progress">🛠️ In Progress</span>
                  )}

                  {issue.status === 'resolved' && (
                    <span className="status-resolved">✅ Resolved</span>
                  )}

                  {currentUserId && issue.user_id === currentUserId && (
                    <button
                      onClick={() => deleteIssue(issue.id, issue.user_id)}
                      className="btn-delete"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
