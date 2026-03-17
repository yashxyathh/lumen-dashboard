"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import "./login.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else if (data.user) {
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
    <div className="login-wrapper">
      <div className="login-container">
        <h1 className="login-title">Login / Sign Up</h1>
        <p className="login-subtitle">Access the Lumen Portal with your credentials</p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-input"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="form-input"
        />

        <div className="role-selector">
          <label className="role-label">Select your Role (for Sign Up)</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="role-select">
            <option value="user">Citizen (User)</option>
            <option value="contractor">Contractor</option>
          </select>
        </div>

        <div className="button-group">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Loading..." : "Login"}
          </button>

          <button
            onClick={handleSignUp}
            disabled={loading}
            className="btn-secondary"
          >
            {loading ? "Loading..." : "Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
