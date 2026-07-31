import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { useLiveness } from '../hooks/useLiveness';

interface Props {
  passportPhotoUrl: string;
  onVerified: (result: { passportEmbedding: number[]; selfieEmbedding: number[]; livenessGesturePassed: boolean }) => void;
}

// Minimum detection confidence before we trust a "face". TinyFaceDetector can
// fire on random images (scenery, patterns), so reject anything weak.
const MIN_FACE_SCORE = 0.55;

export default function LivenessCapture({ passportPhotoUrl, onVerified }: Props) {
  const webcamRef = useRef<Webcam>(null);
  const passportImgRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef<number>();
  const passportEmbeddingRef = useRef<number[] | null>(null);
  const { modelsLoaded, modelLoadError, blinkDetected, processVideoFrame, detectFace, extractDescriptor, resetBlink } =
    useLiveness();
  const [status, setStatus] = useState<'idle' | 'scanning' | 'capturing' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [passportReady, setPassportReady] = useState(false);
  const [passportError, setPassportError] = useState('');

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Validate the uploaded passport photo actually contains a clear face and
  // precompute its embedding once, so the live scan only needs the webcam frame.
  const validatePassportPhoto = async () => {
    const img = passportImgRef.current;
    if (!img || !modelsLoaded) return;
    const result = await detectFace(img);
    if (!result) {
      setPassportError(
        'No face was detected in your passport photo. Upload a clear, front-facing photo of your face.',
      );
      setPassportReady(true);
      return;
    }
    if (result.score < MIN_FACE_SCORE) {
      setPassportError(
        'Your passport photo is too unclear to verify. Upload a clear, front-facing photo of your face.',
      );
      setPassportReady(true);
      return;
    }
    passportEmbeddingRef.current = result.descriptor;
    setPassportReady(true);
  };

  useEffect(() => {
    if (modelsLoaded && passportReady && !passportError && !passportEmbeddingRef.current) {
      validatePassportPhoto();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelsLoaded, passportReady]);

  const startScan = () => {
    resetBlink();
    setStatus('scanning');
    setMessage('Look at the camera and blink naturally to confirm you are present.');
    loop();
  };

  const loop = () => {
    const video = webcamRef.current?.video;
    if (video && video.readyState === 4) {
      processVideoFrame(video);
    }
    rafRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    if (blinkDetected && status === 'scanning') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      capture(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blinkDetected]);

  const capture = async (gesturePassed: boolean) => {
    setStatus('capturing');
    setMessage('Blink detected. Matching your face against your passport photo…');

    const video = webcamRef.current?.video;
    if (!video) return;

    const selfie = await detectFace(video);
    const passportEmbedding = passportEmbeddingRef.current;

    if (!selfie || selfie.score < MIN_FACE_SCORE || !passportEmbedding) {
      setStatus('error');
      setMessage('We could not clearly detect a face. Please retry in good lighting, directly facing the camera.');
      return;
    }

    setStatus('done');
    setMessage('Liveness check complete.');
    onVerified({ passportEmbedding, selfieEmbedding: selfie.descriptor, livenessGesturePassed: gesturePassed });
  };

  if (modelLoadError) {
    return <p className="field-error">{modelLoadError}</p>;
  }

  const canStart = modelsLoaded && passportReady && !passportError;

  return (
    <div className="space-y-3">
      {/* Hidden reference image used to validate & embed the passport photo */}
      <img
        ref={passportImgRef}
        src={passportPhotoUrl}
        crossOrigin="anonymous"
        className="hidden"
        alt=""
        onLoad={() => setPassportReady(true)}
      />

      <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-xl border border-fortune-ink/15 bg-black">
        <Webcam
          ref={webcamRef}
          audio={false}
          mirrored
          videoConstraints={{ facingMode: 'user' }}
          className="w-full"
        />
      </div>

      <p className="text-center text-sm text-fortune-ink/70">{message}</p>

      {passportError && <p className="field-error">{passportError}</p>}

      {status === 'idle' && (
        <button
          type="button"
          className="btn-primary w-full"
          disabled={!canStart}
          onClick={startScan}
        >
          {!modelsLoaded
            ? 'Loading face verification…'
            : !passportReady
              ? 'Loading passport photo…'
              : passportError
                ? 'Upload a clearer passport photo'
                : 'Start liveness check'}
        </button>
      )}

      {status === 'error' && (
        <button type="button" className="btn-secondary w-full" onClick={startScan}>
          Try again
        </button>
      )}
    </div>
  );
}
