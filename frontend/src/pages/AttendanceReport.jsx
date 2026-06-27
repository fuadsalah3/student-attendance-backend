import React, { useState, useEffect } from "react";
import { api } from "../App.jsx";

export default function AttendanceReport({ user }) {
  const [report, setReport] = useState(null);
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchReport = (cid) => {
    setLoading(true);
    const query = cid ? `?course_id=${cid}` : "";
    api(`/attendance/report${query}`).then((data) => {
      if (data.report || data.sessions) {
        setReport(data);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    api("/courses").then((data) => {
      if (data.courses) setCourses(data.courses);
    });
    fetchReport("");
  }, []);

  const handleFilter = (e) => {
    const cid = e.target.value;
    setCourseId(cid);
    fetchReport(cid);
  };

  if (loading) return <p>Loading...</p>;

  if (user.role === "teacher") {
    if (!report?.report || report.report.length === 0) {
      return (
        <div>
          <h1 style={{ marginBottom: 24 }}>Attendance Reports</h1>
          <p style={{ color: "#888" }}>No data yet. Create courses and generate QR codes to get started.</p>
        </div>
      );
    }

    return (
      <div>
        <h1 style={{ marginBottom: 24 }}>Attendance Reports</h1>

        <div className="card">
          <div className="form-group">
            <label>Filter by Course</label>
            <select value={courseId} onChange={handleFilter}>
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {report.report.map(({ course, totalSessions, students }) => (
          <div className="card" key={course.id}>
            <h2>
              {course.name} ({course.code})
            </h2>
            <p style={{ color: "#666", fontSize: 13, marginBottom: 12 }}>
              Total Sessions: {totalSessions}
            </p>

            {students.length === 0 ? (
              <p style={{ color: "#888" }}>No students enrolled</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Attended</th>
                    <th>Total</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{s.email}</td>
                      <td>{s.attended}</td>
                      <td>{s.total}</td>
                      <td>
                        <span
                          className={`badge ${
                            s.percentage >= 75 ? "badge-present" : "badge-absent"
                          }`}
                        >
                          {s.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (!report?.sessions) {
    return (
      <div>
        <h1 style={{ marginBottom: 24 }}>My Attendance</h1>
        <p style={{ color: "#888" }}>No attendance records yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>My Attendance</h1>

      {report.summary && (
        <div className="grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="number">{report.summary.total}</div>
            <div className="label">Total Sessions</div>
          </div>
          <div className="stat-card">
            <div className="number">{report.summary.attended}</div>
            <div className="label">Attended</div>
          </div>
          <div className="stat-card">
            <div className="number">{report.summary.percentage}%</div>
            <div className="label">Attendance Rate</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="form-group">
          <label>Filter by Course</label>
          <select value={courseId} onChange={handleFilter}>
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {report.sessions.map((s) => (
              <tr key={s.id}>
                <td>{s.course_name}</td>
                <td>{new Date(s.date).toLocaleDateString()}</td>
                <td>
                  <span
                    className={`badge ${s.present ? "badge-present" : "badge-absent"}`}
                  >
                    {s.present ? "Present" : "Absent"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
