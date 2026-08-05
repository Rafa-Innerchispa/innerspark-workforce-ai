'use client';
import { useState, useRef } from 'react';

export default function MobileCheckin() {
  const [status, setStatus] = useState('Idle');
  const [photo, setPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStatus('Camera active');
      }
    } catch (err) {
      console.error(err);
      setStatus('Failed to access camera');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setPhoto(dataUrl);
        
        // Stop camera stream
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
      }
    }
  };

  const submitCheckin = () => {
    if (!navigator.geolocation) {
      setStatus('Geolocation not supported');
      return;
    }

    setStatus('Getting location...');
    navigator.geolocation.getCurrentPosition(async (position) => {
      setStatus('Submitting...');
      const payload = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        photo: photo,
        timestamp: new Date().toISOString()
      };

      try {
        const res = await fetch('/api/mobile/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          setStatus('Check-in successful!');
        } else {
          setStatus('Check-in failed on server');
        }
      } catch (err) {
        console.error(err);
        setStatus('Check-in failed completely');
      }
    }, (err) => {
      setStatus(`Geolocation error: ${err.message}`);
    });
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ color: '#333' }}>FEMAR Mobile Check-in</h1>
      <p style={{ fontWeight: 'bold' }}>Status: {status}</p>
      
      {!photo ? (
        <div>
          <video ref={videoRef} style={{ width: '100%', borderRadius: '8px', background: '#000' }} autoPlay playsInline muted />
          <canvas ref={canvasRef} width={640} height={480} style={{ display: 'none' }} />
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={startCamera} style={btnStyle('#0070f3')}>Start Camera</button>
            <button onClick={capturePhoto} style={btnStyle('#10b981')}>Take Photo</button>
          </div>
        </div>
      ) : (
        <div>
          <img src={photo} alt="Captured check-in photo" style={{ width: '100%', borderRadius: '8px' }} />
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => setPhoto(null)} style={btnStyle('#ef4444')}>Retake</button>
            <button onClick={submitCheckin} style={btnStyle('#10b981')}>Submit Check-in</button>
          </div>
        </div>
      )}
    </main>
  );
}

const btnStyle = (bg: string) => ({
  background: bg,
  color: '#fff',
  border: 'none',
  padding: '10px 20px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 'bold'
});
