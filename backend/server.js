import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import qrcode from "qrcode";
import jwt from "jsonwebtoken";
import { connectDb } from "./db.js";
import User from "./models/User.js";
import Course from "./models/Course.js";
import Session from "./models/Session.js";
import Attendance from "./models/Attendance.js";

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET =
  process.env.JWT_SECRET || "attendance-system-secret-key-change-in-production";

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body ? "body present" : "no body");
  next();
});

function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  try {
    const token = header.split(" ")[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

// ---- Auth ----

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (!["teacher", "student"].includes(role)) {
      return res.status(400).json({ error: "Role must be teacher or student" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const user = await User.create({ name, email, password: hashed, role });
    const token = generateToken(user);
    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user);
    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/me", authenticate, async (req, res) => {
  const user = await User.findById(req.user.id).select("name email role");
  res.json({ user });
});

// ---- Courses ----

app.get("/api/courses", authenticate, async (req, res) => {
  try {
    if (req.user.role === "teacher") {
      const courses = await Course.find({ teacher: req.user.id })
        .sort("-createdAt")
        .lean();
      const enriched = await Promise.all(
        courses.map(async (c) => ({
          ...c,
          student_count: c.students?.length || 0,
        }))
      );
      return res.json({ courses: enriched });
    } else {
      const courses = await Course.find({ students: req.user.id })
        .sort("-createdAt")
        .lean();
      const enriched = await Promise.all(
        courses.map(async (c) => ({
          ...c,
          student_count: c.students?.length || 0,
        }))
      );
      return res.json({ courses: enriched });
    }
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/courses", authenticate, requireRole("teacher"), async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: "Name and code are required" });
    }

    const existing = await Course.findOne({ code });
    if (existing) {
      return res.status(409).json({ error: "Course code already exists" });
    }

    const course = await Course.create({ name, code, teacher: req.user.id });
    res.status(201).json({ course });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/courses/enroll", authenticate, requireRole("student"), async (req, res) => {
  try {
    const { code } = req.body;
    const course = await Course.findOne({ code });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (course.students.includes(req.user.id)) {
      return res.json({ message: "Already enrolled" });
    }

    course.students.push(req.user.id);
    await course.save();
    res.json({ message: "Enrolled successfully" });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---- QR Generation ----

app.post("/api/qr/generate", authenticate, requireRole("teacher"), async (req, res) => {
  try {
    const { course_id } = req.body;
    if (!course_id) {
      return res.status(400).json({ error: "Course ID is required" });
    }

    const course = await Course.findOne({ _id: course_id, teacher: req.user.id });
    if (!course) {
      return res.status(404).json({ error: "Course not found or not yours" });
    }

    const qrToken = uuidv4();
    const date = new Date().toISOString().split("T")[0];
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const session = await Session.create({
      course: course_id,
      date,
      qrToken,
      expiresAt,
    });

    const qrData = JSON.stringify({
      token: qrToken,
      course_id,
      course_name: course.name,
      date,
      expires_at: expiresAt.toISOString(),
    });

    const qrImage = await qrcode.toDataURL(qrData);
    res.json({ qrImage, qrToken, expiresAt: expiresAt.toISOString(), course });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---- Attendance ----

app.post("/api/attendance/mark", authenticate, requireRole("student"), async (req, res) => {
  try {
    const { qr_token } = req.body;
    if (!qr_token) {
      return res.status(400).json({ error: "QR token is required" });
    }

    const session = await Session.findOne({
      qrToken: qr_token,
      active: true,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return res.status(400).json({ error: "Invalid or expired QR code" });
    }

    const course = await Course.findById(session.course);
    if (!course.students.map((s) => s.toString()).includes(req.user.id)) {
      return res.status(403).json({ error: "You are not enrolled in this course" });
    }

    const existing = await Attendance.findOne({
      session: session._id,
      student: req.user.id,
    });

    if (existing) {
      return res.status(409).json({ error: "Attendance already marked" });
    }

    await Attendance.create({ session: session._id, student: req.user.id });

    res.json({
      message: "Attendance marked successfully",
      course_name: course.name,
      date: session.date,
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---- Reports ----

app.get("/api/attendance/report", authenticate, async (req, res) => {
  try {
    const { course_id } = req.query;

    if (req.user.role === "teacher") {
      const filter = { teacher: req.user.id };
      if (course_id) filter._id = course_id;
      const courses = await Course.find(filter).lean();

      const report = await Promise.all(
        courses.map(async (course) => {
          const sessions = await Session.find({ course: course._id }).lean();
          const totalSessions = sessions.length;

          const students = await User.find({
            _id: { $in: course.students || [] },
          }).select("name email").lean();

          const studentRecords = await Promise.all(
            students.map(async (student) => {
              const attended = await Attendance.countDocuments({
                session: { $in: sessions.map((s) => s._id) },
                student: student._id,
              });

              return {
                id: student._id,
                name: student.name,
                email: student.email,
                attended,
                total: totalSessions,
                percentage:
                  totalSessions > 0
                    ? Math.round((attended / totalSessions) * 100)
                    : 0,
              };
            })
          );

          return { course, totalSessions, students: studentRecords };
        })
      );

      return res.json({ report });
    } else {
      const match = { students: req.user.id };
      if (course_id) match._id = course_id;
      const courses = await Course.find(match).select("_id name code").lean();
      const courseIds = courses.map((c) => c._id);

      const sessions = await Session.find({ course: { $in: courseIds } })
        .sort("-date")
        .populate("course", "name code")
        .lean();

      const attendanceRecords = await Attendance.find({
        session: { $in: sessions.map((s) => s._id) },
        student: req.user.id,
      }).lean();
      const attendedIds = new Set(
        attendanceRecords.map((a) => a.session.toString())
      );

      const result = sessions.map((s) => ({
        id: s._id,
        date: s.date,
        course_id: s.course._id,
        course_name: s.course.name,
        course_code: s.course.code,
        present: attendedIds.has(s._id.toString()),
      }));

      const total = result.length;
      const attended = result.filter((r) => r.present).length;

      res.json({
        sessions: result,
        summary: {
          total,
          attended,
          percentage: total > 0 ? Math.round((attended / total) * 100) : 0,
        },
      });
    }
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.use((err, req, res, next) => {
  console.error("Express error handler caught:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// ---- Start ----

connectDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  });
