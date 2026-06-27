import mongoose from "mongoose";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const MONGO_URI =
  "mongodb+srv://fuadnesredinhiyar_db_user:Fuad12345@cluster0.mudc019.mongodb.net/attendance_system?retryWrites=true&w=majority&appName=Cluster0";

export async function connectDb() {
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  console.log("Connected to MongoDB");
}
