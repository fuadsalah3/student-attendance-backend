import React, { useState, useEffect } from "react";
import { api } from "../App.jsx";

export default function GenerateQR() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api("/courses").then((data) => {
      if (data.courses) setCourses(data.courses);
    });
  }, []);

  const generateQR = async (e) => {
    e.preventDefault();
    setError("");
    setQrImage("");
    setSession(null);
    setLoading(true);
    try {
      const data = await api("/qr/generate", {
        method: "POST",
        body: JSON.stringify({ course_id: courseId }),
      });
      if (data.error) {
        setError(data.error);
      } else {
        setQrImage(data.qrImage);
        setSession(data);
      }
    } catch {
      setError("Failed to generate QR code");
    } finally {
      setLoading(false);
    }
  };

  const getStatus = () => {
    if (!session) return "";
    const expires = new Date(session.expiresAt);
    const now = new Date();
    const diff = Math.round((expires - now) / 1000);
    if (diff <= 0) return "Expired";
    return `Expires in ${Math.floor(diff / 60)}:${String(diff % 60).padStart(2, "0")}`;
  };

  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => {
      const expires = new Date(session.expiresAt);
      const now = new Date();
      const diff = Math.round((expires - now) / 1000);
      if (diff <= 0) {
        setCountdown("Expired");
        clearInterval(timer);
      } else {
        setCountdown(`${Math.floor(diff / 60)}:${String(diff % 60).padStart(2, "0")}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [session]);

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Generate Attendance QR</h1>

      <div className="card">
        <h2>Select a Course</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={generateQR}>
          <div className="form-group">
            <label>Course</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              required
            >
              <option value="">Select a course</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !courseId}
          >
            {loading ? "Generating..." : "Generate QR Code"}
          </button>
        </form>
      </div>

      {qrImage && (
        <div className="card">
          <h2>QR Code</h2>
          <div className="qr-container">
            <img src={qrImage} alt="Attendance QR Code" />
            <p style={{ fontSize: 14, color: "#666" }}>
              Course: <strong>{session?.course?.name}</strong>
            </p>
            <p style={{ fontSize: 14, color: countdown === "Expired" ? "#d93025" : "#188038" }}>
              {countdown}
            </p>
            <p style={{ fontSize: 13, color: "#888", textAlign: "center" }}>
              Students can scan this QR code to mark attendance.
              <br />
              This code will expire in 5 minutes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
