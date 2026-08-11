import { useEffect, useRef, useState } from 'react';

export type CameraGuide = 'id' | 'signature' | 'passport';

interface Props {
  guide: CameraGuide;
  onCapture: (file: File) => void;
  onCancel: () => void;
  onNativeFallback: () => void;
}

// Aspect ratio of the target framing box for each document type.
const GUIDE_ASPECT: Record<CameraGuide, number> = {
  id: 1.585, // Kenyan National ID card ≈ 85.6mm x 54mm
  signature: 3, // wide strip
  passport: 1, // square passport photo
};

const GUIDE_WIDTH_PCT: Record<CameraGuide, number> = {
  id: 62,
  signature: 82,
  passport: 55,
};

export default function CameraCapture({ guide, onCapture, onCancel, onNativeFallback }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') {
      setFailed(true);
      return;
    }
    let streamPromise: Promise<MediaStream>;
    try {
      streamPromise = mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
    } catch {
      setFailed(true);
      return;
    }
    streamPromise
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    setBusy(true);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (!blob) return;
        onCapture(new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  };

  const subjectLabel = guide === 'signature' ? 'signature' : guide === 'passport' ? 'face' : 'ID';

  if (failed) {
    return (
      <div className="space-y-3 rounded-lg border border-fortune-ink/10 p-4 text-center">
        <p className="text-sm text-fortune-ink/70">
          The in-app camera isn't available here — we'll open your device camera instead.
        </p>
        <div className="flex justify-center gap-3">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={onNativeFallback}>
            Open camera
          </button>
        </div>
      </div>
    );
  }

  const aspect = GUIDE_ASPECT[guide];
  const widthPct = GUIDE_WIDTH_PCT[guide];

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="w-full" />
        {ready && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {/* Spotlight frame: the document must fit inside the clear box */}
            <div
              className="relative rounded-md border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
              style={{ width: `${widthPct}%`, aspectRatio: String(aspect) }}
            />
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-black/50 px-2 py-1 text-xs font-medium text-white/95">
              Fit your {subjectLabel} inside the frame
            </p>
          </div>
        )}
        {!ready && <div className="flex h-48 items-center justify-center text-sm text-white/70">Starting camera…</div>}
      </div>
      <div className="flex gap-3">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-primary flex-1" disabled={!ready || busy} onClick={capture}>
          {busy ? 'Capturing…' : 'Capture photo'}
        </button>
      </div>
    </div>
  );
}
