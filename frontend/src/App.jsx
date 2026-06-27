import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ScanQR from "./pages/ScanQR.jsx";
import GenerateQR from "./pages/GenerateQR.jsx";
import AttendanceReport from "./pages/AttendanceReport.jsx";
import "./App.css";

const API = "/api";

export function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const { headers: extraHeaders, ...fetchOpts } = options;
  return fetch(`${API}${path}`, {
    ...fetchOpts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
  }).then(async (r) => {
    if (r.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    const text = await r.text();
    if (!text) {
      throw new Error("Backend server not running on port 3001. Run 'cd backend && npm start' in another terminal.");
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Server returned ${r.status}: ${text.slice(0, 200)}`);
    }
  });
}

export default function App() {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api("/auth/me").then((data) => {
        if (data.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        } else {
          setUser(null);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      });
    }
  }, []);

  const handleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
    navigate("/dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="app">
      {user && <Navbar user={user} onLogout={handleLogout} />}
      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />}
          />
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to="/dashboard" /> : <Register onLogin={handleLogin} />}
          />
          <Route
            path="/dashboard"
            element={user ? <Dashboard user={user} /> : <Navigate to="/login" />}
          />
          <Route
            path="/scan"
            element={user?.role === "student" ? <ScanQR /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/generate-qr"
            element={user?.role === "teacher" ? <GenerateQR /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/attendance"
            element={user ? <AttendanceReport user={user} /> : <Navigate to="/login" />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
