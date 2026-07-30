import { ChangeEvent, useState } from 'react';
import { getApiErrorMessage } from '../api/client';

interface Props {
  label: string;
  hint?: string;
  onFileSelected: (file: File) => Promise<void>;
  uploaded: boolean;
}

export default function DocumentUploadBox({ label, hint, onFileSelected, uploaded }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

  return (
    <div>
      <p className="field-label">{label}</p>
      <label
        className={`flex h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed text-center transition ${
          uploaded ? 'border-fortune-green bg-fortune-greenLight' : 'border-fortune-ink/20 hover:border-fortune-green/50'
        }`}
      >
        {preview ? (
          <img src={preview} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="px-4">
            <p className="text-sm font-medium text-fortune-ink/70">
              {busy ? 'Uploading…' : uploaded ? 'Uploaded ✓' : 'Tap to fit inside the box'}
            </p>
            {hint && <p className="mt-1 text-xs text-fortune-ink/40">{hint}</p>}
          </div>
        )}
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
      </label>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
