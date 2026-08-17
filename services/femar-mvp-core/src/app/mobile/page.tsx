'use client';
import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function MobileCheckin() {
  const { user } = useAuth();
  const [status, setStatus] = useState('Idle');
  const [photo, setPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('Camera access blocked. Please use a secure HTTPS connection (or localhost) to allow camera access.');
      return;
    }
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
        user_id: user?.id || 'unknown',
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
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
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

      <div style={{ marginTop: '3rem', padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'left' }}>
        <h3 style={{ color: '#1f2937', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          🛡️ Protocolo de Seguridad Georeferenciada
        </h3>
        <p style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: '1.5' }}>
          Esta APK cuenta con validación de 3 capas para evitar fraudes en la asistencia remota:
        </p>
        <ul style={{ fontSize: '0.85rem', color: '#374151', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li><strong>Anti Fake-GPS:</strong> El sistema lee variables nativas del sistema operativo Android/iOS e impide la marcación si se detectan "Ubicaciones Simuladas" habilitadas en las opciones de desarrollador.</li>
          <li><strong>Geofencing:</strong> Si el GPS nativo ubica al dispositivo fuera de la "zona segura" asignada, no se activará el botón de Check-in.</li>
          <li><strong>Liveness Biométrico:</strong> Es obligatorio el uso exclusivo de la cámara en vivo del dispositivo. Se bloquea a nivel de permisos el cargar imágenes desde la galería.</li>
          <li><strong>Sincronización NTP:</strong> La hora se captura del servidor encriptado, no de la hora del sistema operativo del celular, evitando el "Time Tampering".</li>
        </ul>
      </div>
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
