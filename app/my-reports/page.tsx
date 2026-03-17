"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import "./my-reports.css";

export default function MyReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
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
    else {
      const reportsData = data || [];
      setReports(reportsData);
      if (reportsData.length > 0) {
        setSelectedReport(reportsData[0]);
      }
    }
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

  if (loading) return <div className="loading">Loading your reports...</div>;

  return (
    <div className="reports-container">
      {reports.length === 0 ? (
        <div className="empty-state">
          <p>You haven't reported any issues yet.</p>
          <button onClick={() => router.push("/submit")} className="btn-report">Report an Issue</button>
        </div>
      ) : (
        <div className="reports-wrapper">
          {/* Left Sidebar - List of Reports */}
          <div className="reports-sidebar">
            <div className="sidebar-header">
              <h2>My Tickets</h2>
              <p>Track your submitted reports</p>
            </div>

            <div className="reports-list">
              {reports.map((report) => {
                const status = getStatusStyle(report.status);
                const isSelected = selectedReport?.id === report.id;
                return (
                  <div
                    key={report.id}
                    className={`report-list-item ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="report-list-content">
                      <h4 className="report-list-title">{report.title}</h4>
                      <p className="report-list-date">
                        {new Date(report.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <span className="report-list-status" style={{ color: status.color, backgroundColor: status.bg }}>
                      {status.label.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side - Detailed View */}
          {selectedReport && (
            <div className="report-detail">
              <div className="detail-header">
                <div>
                  <h1 className="detail-title">{selectedReport.title}</h1>
                  <p className="detail-badge-text">
                    {getStatusStyle(selectedReport.status).label.split(' ').slice(0, 2).join(' ')}
                  </p>
                </div>
                <button className="btn-add-comment">+ Add Comment</button>
              </div>

              <div className="detail-content">
                <div className="content-wrapper">
                  {/* Left Side - Image and Description */}
                  <div className="content-left">
                    {selectedReport.image && (
                      <div className="detail-image-container-small">
                        <img src={selectedReport.image} alt="issue" className="detail-image-small" />
                      </div>
                    )}

                    <div className="content-section">
                      <h3>Description</h3>
                      <p>{selectedReport.description}</p>
                    </div>

                    <div className="content-section">
                      <p className="landmark-info">
                        📍 {selectedReport.landmark}
                      </p>
                    </div>
                  </div>

                  {/* Right Side - Ticket Progress */}
                  <div className="content-right">
                    <div className="progress-container-right">
                      <h3>Ticket Progress</h3>
                      <div className="progress-steps">
                        <div className={`progress-step ${['pending', 'approved', 'in-progress', 'resolved', 'closed'].includes(selectedReport.status) ? 'active' : ''}`}>
                          <div className="progress-dot">●</div>
                          <div className="progress-step-text">
                            <p>Reported</p>
                            <span>Issue submitted by user</span>
                          </div>
                        </div>
                        <div className={`progress-step ${['approved', 'in-progress', 'resolved', 'closed'].includes(selectedReport.status) ? 'active' : ''}`}>
                          <div className="progress-dot">●</div>
                          <div className="progress-step-text">
                            <p>Under Review</p>
                            <span>Technician evaluating the report</span>
                          </div>
                        </div>
                        <div className={`progress-step ${['in-progress', 'resolved', 'closed'].includes(selectedReport.status) ? 'active' : ''}`}>
                          <div className="progress-dot">●</div>
                          <div className="progress-step-text">
                            <p>Assigned</p>
                            <span>Work assigned to contractor</span>
                          </div>
                        </div>
                        <div className={`progress-step ${['resolved', 'closed'].includes(selectedReport.status) ? 'active' : ''}`}>
                          <div className="progress-dot">●</div>
                          <div className="progress-step-text">
                            <p>Resolved</p>
                            <span>Issue fixed and verified</span>
                          </div>
                        </div>
                      </div>

                      {selectedReport.status !== 'closed' && selectedReport.status !== 'rejected' && (
                        <p className="estimated-resolution">
                          ⏰ Estimated resolution: {new Date(new Date(selectedReport.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Funding Progress for Approved - Full Width Below */}
                {selectedReport.status === 'approved' && (
                  <div className="funding-container">
                    <h3>Funding Progress</h3>
                    <p className="funding-text">
                      ${selectedReport.current_funding || 0} raised of ${selectedReport.funding_goal || 0}
                    </p>
                    <div className="progress-bar-large">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(((selectedReport.current_funding || 0) / (selectedReport.funding_goal || 1)) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
