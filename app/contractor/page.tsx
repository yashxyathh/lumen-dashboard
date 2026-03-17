"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import "./contractor.css";

export default function ContractorPage() {
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [myBids, setMyBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

    const { data: available, error: availableError } = await supabase
      .from("issues")
      .select("*")
      .eq("status", "approved")
      .is("assigned_to", null);

    if (availableError) console.error("Error fetching available:", availableError);
    setAvailableJobs(available || []);

    const { data: active, error: activeError } = await supabase
      .from("issues")
      .select("*")
      .eq("assigned_to", user.id);

    if (activeError) console.error("Error fetching active:", activeError);
    setMyJobs(active || []);

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
      fetchData();
    }
  }

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

  if (loading) return <div className="loading-container">Loading Contractor Portal...</div>;

  return (
    <div className="contractor-container">
      <div className="contractor-header">
        <h1>🏗️ Contractor Portal</h1>
        <p>Manage your tenders, proposals, and active projects</p>
      </div>

      <div className="contractor-layout">
        {/* COLUMN 1: AVAILABLE TENDERS */}
        <div className="contractor-column">
          <div className="column-section">
            <div className="section-header tenders">
              <h2>📋 Available Tenders</h2>
            </div>
            <div className="cards-container">
              {availableJobs.length === 0 && <div className="empty-state">No new approved tenders available</div>}
              {availableJobs.map(job => (
                <div key={job.id} className="tender-card">
                  {job.image && (
                    <div className="tender-image-container">
                      <img src={job.image} alt={job.title} className="tender-image" />
                    </div>
                  )}
                  <div className="tender-card-content">
                    <h3>{job.title}</h3>
                    <p>{job.description}</p>
                    <div className="tender-funding">
                      <span>Funding Progress</span>
                      <span>${job.current_funding} / ${job.funding_goal}</span>
                    </div>

                    <button
                      className="apply-button"
                      onClick={() => setSelectedIssue(job)}
                    >
                      Apply for Tender
                    </button>
                  </div>

                  {selectedIssue?.id === job.id && (
                    <div className="proposal-form">
                      <h4>📝 Submit Your Proposal</h4>
                      <div className="form-group">
                        <label>Days to complete:</label>
                        <input
                          type="number"
                          value={days}
                          onChange={e => setDays(e.target.value)}
                          placeholder="e.g., 5"
                        />
                      </div>

                      <div className="form-group">
                        <label>Materials needed:</label>
                        <textarea
                          value={materials}
                          onChange={e => setMaterials(e.target.value)}
                          placeholder="List the materials you'll need..."
                        />
                      </div>

                      <div className="form-group">
                        <label>Why should we hire you?</label>
                        <textarea
                          value={experience}
                          onChange={e => setExperience(e.target.value)}
                          placeholder="Share your experience and expertise..."
                        />
                      </div>

                      <div className="form-buttons">
                        <button
                          className="submit-proposal-button"
                          onClick={() => submitTender(job.id)}
                        >
                          ✓ Send Proposal
                        </button>
                        <button
                          className="cancel-button"
                          onClick={() => setSelectedIssue(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMN 2: PROPOSALS + ACTIVE REPAIRS */}
        <div className="contractor-column">
          {/* Pending Proposals */}
          <div className="column-section">
            <div className="section-header proposals">
              <h2>📑 My Proposals</h2>
            </div>
            <div className="cards-container">
              {myBids.length === 0 && <div className="empty-state">No pending proposals</div>}
              {myBids.map(bid => (
                <div key={bid.id} className="proposal-item">
                  <div className="proposal-info">
                    <p><b>Project:</b> {bid.issues?.title}</p>
                    <div className="proposal-status">⏳ Pending Admin Review</div>
                  </div>
                  <button
                    className="withdraw-button"
                    onClick={() => withdrawBid(bid.id)}
                  >
                    🚫 Withdraw
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Active Repairs */}
          <div className="column-section">
            <div className="section-header active-repairs">
              <h2>🛠️ Active Repairs</h2>
            </div>
            <div className="cards-container">
              {myJobs.length === 0 && <div className="empty-state">No active projects</div>}
              {myJobs.map(job => (
                <div key={job.id} className="repair-card">
                  <h3>{job.title}</h3>
                  <span className="status-badge">{job.status.toUpperCase()}</span>

                  {job.status === 'in-progress' && (
                    <div className="finish-job-section">
                      <p>📸 Upload proof of work to complete:</p>
                      <div className="file-input-wrapper">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleResolutionUpload(e, job.id)}
                        />
                      </div>
                    </div>
                  )}
                  {job.status === 'resolved' && (
                    <div className="job-complete-message">
                      ✅ Job complete. Admin is verifying for payment release.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMN 3: EMPTY FOR BALANCE */}
        <div className="contractor-column" />
      </div>
    </div>
  );
}
