"use client";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav style={{
      padding: "15px",
      background: "#111",
      color: "white",
      display: "flex",
      gap: "20px"
    }}>
      <Link href="/">Home</Link>
      <Link href="/submit">Submit Issue</Link>
      <Link href="/heatmap">Heatmap</Link>
      <Link href="/myreports">My Reports</Link>
    </nav>
  );
}