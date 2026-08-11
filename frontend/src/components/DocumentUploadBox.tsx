import { ChangeEvent, useRef, useState } from 'react';
import { getApiErrorMessage } from '../api/client';
import CameraCapture, { CameraGuide } from './CameraCapture';

interface Props {
  label: string;
  hint?: string;
  guide?: CameraGuide;
  preferUpload?: boolean;
  onFileSelected: (file: File) => Promise<void>;
  uploaded: boolean;
}

export default function DocumentUploadBox({
  label,
  hint,
  guide = 'id',
  preferUpload = false,
  onFileSelected,
  uploaded,
}: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setError('');
    setBusy(true);
    try {
      await onFileSelected(file);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Upload failed, please try again'));
    } finally {
      setBusy(false);
    }
  };

  const handleFileInput = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await upload(file);
  };

  if (showCamera) {
    return (
      <div>
        <p className="field-label">{label}</p>
        <CameraCapture
          guide={guide}
          onCapture={upload}
          onCancel={() => setShowCamera(false)}
          onNativeFallback={() => {
            setShowCamera(false);
            cameraInputRef.current?.click();
          }}
        />
        {error && <p className="field-error">{error}</p>}
      </div>
    );
  }

  const takeButton = (
    <button type="button" className="btn-primary" disabled={busy} onClick={() => setShowCamera(true)}>
      Take photo
    </button>
  );
  const uploadButton = (
    <button type="button" className="btn-secondary" disabled={busy} onClick={() => uploadInputRef.current?.click()}>
      Upload
    </button>
  );

  return (
    <div>
      <p className="field-label">{label}</p>
      <div
        className={`relative overflow-hidden rounded-lg border-2 border-dashed transition ${
          uploaded ? 'border-fortune-green bg-fortune-greenLight' : 'border-fortune-ink/20'
        }`}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="h-40 w-full object-cover" />
            {uploaded && (
              <span className="absolute left-2 top-2 rounded bg-fortune-green px-2 py-0.5 text-xs font-medium text-white">
                Uploaded ✓
              </span>
            )}
            <div className="absolute bottom-2 right-2 flex gap-2">
              <button
                type="button"
                className="rounded bg-black/60 px-3 py-1 text-xs font-medium text-white hover:bg-black/70"
                onClick={() => setShowCamera(true)}
              >
                Retake
              </button>
              <button
                type="button"
                className="rounded bg-white/90 px-3 py-1 text-xs font-medium text-fortune-ink hover:bg-white"
                onClick={() => uploadInputRef.current?.click()}
              >
                Upload new
              </button>
            </div>
          </>
        ) : (
          <div className="flex h-40 flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-sm font-medium text-fortune-ink/70">
              {busy ? 'Uploading…' : uploaded ? 'Uploaded ✓' : 'Take a photo or upload'}
            </p>
            {hint && <p className="text-xs text-fortune-ink/40">{hint}</p>}
            <div className="flex gap-3">
              {preferUpload ? (
                <>
                  {uploadButton}
                  {takeButton}
                </>
              ) : (
                <>
                  {takeButton}
                  {uploadButton}
                </>
              )}
            </div>
          </div>
        )}
        <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
