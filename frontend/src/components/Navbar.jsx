import React from "react";
import { Link } from "react-router-dom";

export default function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <Link to="/dashboard" className="brand">
        Attendance System
      </Link>
      <div className="nav-links">
        {user.role === "teacher" && (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/generate-qr">Generate QR</Link>
            <Link to="/attendance">Reports</Link>
          </>
        )}
        {user.role === "student" && (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/scan">Scan QR</Link>
            <Link to="/attendance">My Attendance</Link>
          </>
        )}
        <span className="user-info">{user.name} ({user.role})</span>
        <button onClick={onLogout}>Logout</button>
      </div>
    </nav>
  );
}
