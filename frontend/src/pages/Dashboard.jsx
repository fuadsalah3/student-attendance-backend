import React, { useState, useEffect } from "react";
import { api } from "../App.jsx";

export default function Dashboard({ user }) {
  const [courses, setCourses] = useState([]);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [enrollCode, setEnrollCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/courses").then((data) => {
      if (data.courses) setCourses(data.courses);
    });
  }, []);

  const createCourse = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    const data = await api("/courses", {
      method: "POST",
      body: JSON.stringify({ name: courseName, code: courseCode }),
    });
    if (data.error) {
      setError(data.error);
    } else {
      setMessage(`Course "${data.course.name}" created!`);
      setCourseName("");
      setCourseCode("");
      setCourses((prev) => [data.course, ...prev]);
    }
  };

  const enrollCourse = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    const data = await api("/courses/enroll", {
      method: "POST",
      body: JSON.stringify({ code: enrollCode }),
    });
    if (data.error) {
      setError(data.error);
    } else {
      setMessage(data.message);
      setEnrollCode("");
      api("/courses").then((d) => {
        if (d.courses) setCourses(d.courses);
      });
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Welcome, {user.name}!</h1>

      {user.role === "teacher" && (
        <div className="card">
          <h2>Create Course</h2>
          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}
          <form onSubmit={createCourse}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                <label>Course Name</label>
                <input
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Mathematics 101"
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                <label>Course Code</label>
                <input
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="e.g. MATH101"
                  required
                />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {user.role === "student" && (
        <div className="card">
          <h2>Enroll in Course</h2>
          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}
          <form onSubmit={enrollCourse}>
            <div style={{ display: "flex", gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Course Code</label>
                <input
                  value={enrollCode}
                  onChange={(e) => setEnrollCode(e.target.value)}
                  placeholder="Enter course code"
                  required
                />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button type="submit" className="btn btn-primary">
                  Enroll
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <h2 style={{ marginBottom: 16 }}>Your Courses</h2>
      {courses.length === 0 ? (
        <p style={{ color: "#888" }}>
          {user.role === "teacher"
            ? "No courses yet. Create one above!"
            : "No courses yet. Enroll using a course code!"}
        </p>
      ) : (
        <div className="grid">
          {courses.map((c) => (
            <div className="card" key={c._id}>
              <h3>{c.name}</h3>
              <p style={{ color: "#666", fontSize: 13, marginBottom: 8 }}>
                Code: <strong>{c.code}</strong>
              </p>
              <p style={{ color: "#888", fontSize: 13 }}>
                {c.student_count || 0} student{(c.student_count || 0) !== 1 ? "s" : ""} enrolled
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
