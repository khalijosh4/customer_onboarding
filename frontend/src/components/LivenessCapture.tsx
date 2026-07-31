import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { useLiveness } from '../hooks/useLiveness';

interface Props {
  passportPhotoUrl: string;
  onVerified: (result: { passportEmbedding: number[]; selfieEmbedding: number[]; livenessGesturePassed: boolean }) => void;
}

export default function LivenessCapture({ passportPhotoUrl, onVerified }: Props) {
  const webcamRef = useRef<Webcam>(null);
  const passportImgRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef<number>();
  const { modelsLoaded, modelLoadError, blinkDetected, processVideoFrame, extractDescriptor, resetBlink } =
    useLiveness();
  const [status, setStatus] = useState<'idle' | 'scanning' | 'capturing' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [passportReady, setPassportReady] = useState(false);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

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

    const selfieEmbedding = await extractDescriptor(video);
    const passportEmbedding = passportImgRef.current ? await extractDescriptor(passportImgRef.current) : null;

    if (!selfieEmbedding || !passportEmbedding) {
      setStatus('error');
      setMessage('We could not clearly detect a face. Please retry in good lighting.');
      return;
    }

    setStatus('done');
    setMessage('Liveness check complete.');
    onVerified({ passportEmbedding, selfieEmbedding, livenessGesturePassed: gesturePassed });
  };

  if (modelLoadError) {
    return <p className="field-error">{modelLoadError}</p>;
  }

  return (
    <div className="space-y-3">
      {/* Hidden reference image used to compute the passport-photo embedding */}
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

      {status === 'idle' && (
        <button
          type="button"
          className="btn-primary w-full"
          disabled={!modelsLoaded || !passportReady}
          onClick={startScan}
        >
          {!modelsLoaded
            ? 'Loading face verification…'
            : !passportReady
              ? 'Loading passport photo…'
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
