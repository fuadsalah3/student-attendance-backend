import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

attendanceSchema.index({ session: 1, student: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
