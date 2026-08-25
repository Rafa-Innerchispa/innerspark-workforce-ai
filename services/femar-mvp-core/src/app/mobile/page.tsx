'use client';
import { useRef, useState } from 'react';

export default function MobileCheckin() {
  const [status, setStatus] = useState('Listo para marcar');
  const [photo, setPhoto] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ event_at?: string; geofence?: { status?: string } } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('Cámara activa');
      }
    } catch (error) {
      console.error(error);
      setStatus('No fue posible acceder a la cámara');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    setPhoto(canvasRef.current.toDataURL('image/jpeg', 0.86));
    const stream = videoRef.current.srcObject as MediaStream | null;
    stream?.getTracks().forEach(track => track.stop());
    setStatus('Foto capturada. Obtén tu ubicación para marcar.');
  };

  const submitCheckin = () => {
    if (!photo) {
      setStatus('Primero toma una foto');
      return;
    }
    if (!navigator.geolocation) {
      setStatus('Este dispositivo no ofrece geolocalización');
      return;
    }

    setStatus('Verificando ubicación...');
    navigator.geolocation.getCurrentPosition(async position => {
      const requestId = crypto.randomUUID();
      setStatus('Registrando marcación segura...');
      try {
        const res = await fetch('/api/mobile/checkin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': requestId,
          },
          body: JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            photo,
            request_id: requestId,
            device_timestamp: new Date().toISOString(),
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus(body.message || body.error || 'La marcación fue rechazada por el servidor');
          return;
        }
        setLastResult(body);
        setStatus(body.duplicate ? 'Marcación ya registrada' : 'Marcación registrada correctamente');
      } catch (error) {
        console.error(error);
        setStatus('No fue posible comunicarse con el servidor');
      }
    }, error => {
      setStatus(`No se pudo obtener la ubicación: ${error.message}`);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  return (
    <main style={{ minHeight: '100vh', padding: '2rem 1rem 4rem', fontFamily: 'Inter, system-ui, sans-serif', background: 'linear-gradient(180deg,#f7f9fc 0%,#eef3f8 100%)' }}>
      <section style={{ maxWidth: 620, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, letterSpacing: 1.4, fontWeight: 800, color: '#5b6b7d' }}>WORKFORCE • MOBILE</div>
          <h1 style={{ margin: '8px 0 6px', fontSize: 34, color: '#111827' }}>Marcación remota</h1>
          <p style={{ margin: 0, color: '#667085', lineHeight: 1.55 }}>Identidad desde tu sesión, hora validada por el servidor y evidencia privada de ubicación + foto.</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e6eaf0', borderRadius: 20, padding: 18, boxShadow: '0 16px 50px rgba(16,24,40,.08)' }}>
          <div style={{ padding: '10px 12px', background: '#f3f6fa', borderRadius: 12, fontWeight: 700, color: '#344054', marginBottom: 16 }}>{status}</div>
          {!photo ? (
            <div>
              <video ref={videoRef} style={{ width: '100%', borderRadius: 16, background: '#101828', minHeight: 280 }} autoPlay playsInline muted />
              <canvas ref={canvasRef} width={640} height={480} style={{ display: 'none' }} />
              <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={startCamera} style={btnStyle('#1d2939')}>Activar cámara</button>
                <button onClick={capturePhoto} style={btnStyle('#1570ef')}>Tomar foto</button>
              </div>
            </div>
          ) : (
            <div>
              <img src={photo} alt="Foto de evidencia de marcación" style={{ width: '100%', borderRadius: 16 }} />
              <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={() => { setPhoto(null); setLastResult(null); }} style={btnStyle('#667085')}>Repetir foto</button>
                <button onClick={submitCheckin} style={btnStyle('#039855')}>Registrar marcación</button>
              </div>
            </div>
          )}

          {lastResult && (
            <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: '#ecfdf3', color: '#05603a', fontSize: 14 }}>
              Hora servidor: <strong>{lastResult.event_at || 'registrada'}</strong><br />
              Geocerca: <strong>{lastResult.geofence?.status || 'not_configured'}</strong>
            </div>
          )}
        </div>

        <div style={{ marginTop: 20, padding: 18, background: '#fff', borderRadius: 16, border: '1px solid #e6eaf0' }}>
          <h3 style={{ margin: '0 0 10px', color: '#1d2939' }}>Verificaciones activas</h3>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#475467', lineHeight: 1.7, fontSize: 14 }}>
            <li><strong>Identidad:</strong> el servidor toma usuario y empresa de la sesión autenticada.</li>
            <li><strong>Hora:</strong> la hora oficial de la marcación se genera en el servidor; la hora del dispositivo queda sólo como evidencia.</li>
            <li><strong>Ubicación:</strong> se guardan coordenadas y precisión. La geocerca se valida sólo cuando la empresa tiene una zona configurada.</li>
            <li><strong>Foto:</strong> se captura desde la cámara del navegador y se almacena de forma privada. No se anuncia liveness biométrico hasta integrar una verificación real.</li>
            <li><strong>Anti-fraude:</strong> esta versión web no afirma detectar Fake-GPS del sistema operativo. Esa capacidad requiere attestation nativa del dispositivo.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

const btnStyle = (background: string) => ({
  background,
  color: '#fff',
  border: 'none',
  padding: '11px 17px',
  borderRadius: 10,
  cursor: 'pointer',
  fontWeight: 800,
});
