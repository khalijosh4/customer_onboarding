import { useState } from 'react';
import { apiClient, getApiErrorMessage } from '../api/client';
import { Application } from '../types';
import WizardLayout from '../components/WizardLayout';
import DocumentUploadBox from '../components/DocumentUploadBox';
import LivenessCapture from '../components/LivenessCapture';

interface Props {
  application: Application;
  onUpdated: (app: Application) => void;
  onBack: () => void;
}

export default function Step8Documents({ application, onUpdated, onBack }: Props) {
  const [uploaded, setUploaded] = useState({
    id_front: false,
    id_back: false,
    signature: false,
    passport_photo: false,
  });
  const [passportPhotoUrl, setPassportPhotoUrl] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'checking' | 'match' | 'mismatch'>('idle');
  const [livenessDone, setLivenessDone] = useState(false);
  const [error, setError] = useState('');
  const [continuing, setContinuing] = useState(false);

  const upload = async (kind: keyof typeof uploaded, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    await apiClient.post(`/documents/${application.id}/upload/${kind}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setUploaded((u) => ({ ...u, [kind]: true }));

    if (kind === 'passport_photo') {
      setPassportPhotoUrl(URL.createObjectURL(file));
    }

    if (kind === 'id_front') {
      setOcrStatus('checking');
      // Give the backend a moment to finish OCR + IPRS before polling.
      setTimeout(async () => {
        const { data } = await apiClient.get<Application>(`/applications/${application.id}`);
        setOcrStatus(data.idOcrMatchesEnteredData ? 'match' : 'mismatch');
      }, 1500);
    }
  };

  const allDocsUploaded = uploaded.id_front && uploaded.id_back && uploaded.signature && uploaded.passport_photo;

  const handleLivenessVerified = async (result: {
    passportEmbedding: number[];
    selfieEmbedding: number[];
    livenessGesturePassed: boolean;
  }) => {
    try {
      await apiClient.post(`/documents/${application.id}/liveness`, result);
      setLivenessDone(true);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Liveness verification failed'));
    }
  };

  const continueToPayment = async () => {
    setContinuing(true);
    const { data } = await apiClient.get<Application>(`/applications/${application.id}`);
    setContinuing(false);
    onUpdated(data);
  };

  return (
    <WizardLayout
      currentStep={8}
      title="Verify your documents"
      subtitle="Fit each document inside its box. This is used to confirm your identity."
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <DocumentUploadBox
            label="National ID / Passport — front"
            hint="Make sure all text is clear and unobstructed"
            uploaded={uploaded.id_front}
            onFileSelected={(f) => upload('id_front', f)}
          />
          <DocumentUploadBox
            label="National ID — back"
            hint="Skip if you're using a passport"
            uploaded={uploaded.id_back}
            onFileSelected={(f) => upload('id_back', f)}
          />
          <DocumentUploadBox
            label="Signature"
            hint="Sign on plain paper and photograph it"
            uploaded={uploaded.signature}
            onFileSelected={(f) => upload('signature', f)}
          />
          <DocumentUploadBox
            label="Passport-size photo"
            hint="Clear, front-facing, good lighting"
            uploaded={uploaded.passport_photo}
            onFileSelected={(f) => upload('passport_photo', f)}
          />
        </div>

        {ocrStatus === 'checking' && (
          <p className="text-sm text-fortune-ink/60">Reading your ID and cross-checking with your details…</p>
        )}
        {ocrStatus === 'match' && (
          <p className="rounded-lg bg-fortune-greenLight p-3 text-sm text-fortune-greenDark">
            ID scan matches the details you entered.
          </p>
        )}
        {ocrStatus === 'mismatch' && (
          <p className="rounded-lg border border-fortune-terracotta/30 bg-fortune-terracotta/5 p-3 text-sm text-fortune-terracotta">
            We couldn't automatically confirm your ID scan matches the details you entered. An admin
            will review this manually — you can still continue.
          </p>
        )}

        {uploaded.passport_photo && !livenessDone && (
          <div className="rounded-lg border border-fortune-ink/10 p-5">
            <h3 className="mb-3 font-semibold text-fortune-ink">Liveness check</h3>
            <LivenessCapture passportPhotoUrl={passportPhotoUrl!} onVerified={handleLivenessVerified} />
          </div>
        )}

        {livenessDone && (
          <p className="rounded-lg bg-fortune-greenLight p-3 text-sm text-fortune-greenDark">
            Liveness check complete — your live photo matches your passport photo.
          </p>
        )}

        {error && <p className="field-error">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onBack}>Back</button>
          <button
            className="btn-primary flex-1"
            disabled={!allDocsUploaded || !livenessDone || continuing}
            onClick={continueToPayment}
          >
            {continuing ? 'Continuing…' : 'Continue to payment'}
          </button>
        </div>
      </div>
    </WizardLayout>
  );
}
