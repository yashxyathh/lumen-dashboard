"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user"); // Default role
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async () => {
    setLoading(true);
    // 1. Create the user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else if (data.user) {
      // 2. Create the profile with the selected role
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([{ id: data.user.id, role: role }]);

      if (profileError) {
        console.error(profileError);
      } else {
        alert("Signup successful! Check your email for verification.");
      }
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      router.push("/");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "50px", maxWidth: "400px", margin: "0 auto" }}>
      <h1>Login / Sign Up</h1>
      
      <input 
        type="email" placeholder="Email" 
        value={email} onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", width: "100%", padding: "10px", marginBottom: "10px" }}
      />
      
      <input 
        type="password" placeholder="Password" 
        value={password} onChange={(e) => setPassword(e.target.value)}
        style={{ display: "block", width: "100%", padding: "10px", marginBottom: "10px" }}
      />

      <div style={{ marginBottom: "20px" }}>
        <label>Select your Role (for Sign Up): </label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="user">Citizen (User)</option>
          <option value="contractor">Contractor</option>
        </select>
      </div>

      <button onClick={handleLogin} disabled={loading} style={{ marginRight: "10px" }}>
        {loading ? "Loading..." : "Login"}
      </button>
      
      <button onClick={handleSignUp} disabled={loading} style={{ backgroundColor: "#eee" }}>
        Sign Up
      </button>
    </div>
  );
}