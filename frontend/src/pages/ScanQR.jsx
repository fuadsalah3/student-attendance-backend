import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../App.jsx";

export default function ScanQR() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanning = async () => {
    setError("");
    setResult(null);
    setMessage("");
    setScanning(true);

    try {
      const scanner = new Html5Qrcode("scanner-element");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          await scanner.stop();
          setScanning(false);

          try {
            const qrData = JSON.parse(decodedText);
            if (!qrData.token) {
              setError("Invalid QR code format");
              return;
            }

            setResult(qrData);
            const data = await api("/attendance/mark", {
              method: "POST",
              body: JSON.stringify({ qr_token: qrData.token }),
            });

            if (data.error) {
              setError(data.error);
            } else {
              setMessage(`Present at ${data.course_name} on ${data.date}!`);
            }
          } catch {
            setError("Invalid QR code data");
          }
        },
        () => {}
      );
    } catch (err) {
      setError("Camera access denied or not available");
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Scan Attendance QR</h1>

      <div className="card">
        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}

        {!scanning && !result && (
          <div style={{ textAlign: "center" }}>
            <p style={{ marginBottom: 16, color: "#666" }}>
              Point your camera at the QR code displayed by your teacher
            </p>
            <button className="btn btn-primary" onClick={startScanning}>
              Start Camera
            </button>
          </div>
        )}

        {scanning && (
          <div>
            <div id="scanner-element" ref={containerRef} className="scanner-container" />
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button className="btn btn-danger" onClick={stopScanning}>
                Stop Scanning
              </button>
            </div>
          </div>
        )}

        {result && !scanning && (
          <div style={{ textAlign: "center" }}>
            <p style={{ marginBottom: 16, color: "#666" }}>
              Scanned: <strong>{result.course_name}</strong>
            </p>
            {!message && (
              <button className="btn btn-primary" onClick={startScanning}>
                Scan Again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
