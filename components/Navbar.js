"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("");
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setRole(data?.role || "");
      }
    };
    getSession();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/login");
    router.refresh();
  };

  return (
    <nav style={{
      padding: "15px",
      background: "#111",
      color: "white",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }}>
      <div style={{ display: "flex", gap: "20px" }}>
        <Link href="/">Home</Link>
        <Link href="/submit">Submit Issue</Link>
        
        {/* ADDED THIS LINE: Shows for logged-in users who aren't admins/contractors */}
        {user && role === 'user' && (
          <Link href="/my-reports" style={{ color: "#74b9ff" }}>My Reports</Link>
        )}

        <Link href="/heatmap">Heatmap</Link>
        
        {role === 'admin' && <Link href="/admin" style={{color: "yellow"}}>Admin Panel</Link>}
        {role === 'contractor' && <Link href="/contractor" style={{color: "cyan"}}>Contractor View</Link>}
      </div>

      <div>
        {user ? (
          <>
            <span style={{ marginRight: "15px", fontSize: "12px" }}>{user.email} ({role})</span>
            <button onClick={handleLogout} style={{ cursor: "pointer", background: "none", border: "1px solid white", color: "white", borderRadius: "4px", padding: "2px 8px" }}>Logout</button>
          </>
        ) : (
          <Link href="/login">Login</Link>
        )}
      </div>
    </nav>
  );
}