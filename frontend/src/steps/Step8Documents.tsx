import { useEffect, useRef, useState } from 'react';
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
  const [ocrExtracted, setOcrExtracted] = useState<NonNullable<Application['idOcrExtractedData']> | null>(null);
  const [livenessVerified, setLivenessVerified] = useState<boolean | null>(null);
  const [livenessScore, setLivenessScore] = useState<number | null>(null);
  const [livenessAttempt, setLivenessAttempt] = useState(0);
  const [error, setError] = useState('');
  const [continuing, setContinuing] = useState(false);
  const ocrTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (ocrTimer.current) clearTimeout(ocrTimer.current);
    };
  }, []);

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
      if (ocrTimer.current) clearTimeout(ocrTimer.current);
      setOcrStatus('checking');
      const poll = () => {
        apiClient
          .get<Application>(`/applications/${application.id}`)
          .then(({ data }) => {
            if (data.idOcrCompleted) {
              setOcrExtracted(data.idOcrExtractedData ?? null);
              setOcrStatus(data.idOcrMatchesEnteredData ? 'match' : 'mismatch');
            } else {
              ocrTimer.current = setTimeout(poll, 2000);
            }
          })
          .catch(() => {
            ocrTimer.current = setTimeout(poll, 2000);
          });
      };
      ocrTimer.current = setTimeout(poll, 1500);
    }
  };

  const allDocsUploaded = uploaded.id_front && uploaded.id_back && uploaded.signature && uploaded.passport_photo;

  const handleLivenessVerified = async (result: {
    passportEmbedding: number[];
    selfieEmbedding: number[];
    livenessGesturePassed: boolean;
  }) => {
    try {
      const { data } = await apiClient.post<{ verified: boolean; matchScore: number }>(
        `/documents/${application.id}/liveness`,
        result,
      );
      setLivenessScore(data.matchScore);
      if (data.verified) {
        setLivenessVerified(true);
      } else {
        setLivenessVerified(false);
        setError(
          `Face match failed (${(data.matchScore * 100).toFixed(0)}% similarity). Please retry in good lighting, directly facing the camera.`,
        );
        setLivenessAttempt((n) => n + 1);
      }
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Liveness verification failed'));
      setLivenessAttempt((n) => n + 1);
    }
  };

  const continueToPayment = async () => {
    setContinuing(true);
    try {
      const { data } = await apiClient.get<Application>(`/applications/${application.id}`);
      setContinuing(false);
      onUpdated(data);
    } catch (err: any) {
      setContinuing(false);
      setError(getApiErrorMessage(err, 'Failed to load application'));
    }
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
          <div className="rounded-lg border border-fortune-terracotta/30 bg-fortune-terracotta/5 p-3 text-sm text-fortune-terracotta">
            <p className="font-semibold">
              Your ID scan doesn't fully match the details you entered. This is what we read from your ID:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Full names: <span className="font-medium">{ocrExtracted?.fullNameGuess || 'not detected'}</span>
              </li>
              <li>
                ID number: <span className="font-medium">{ocrExtracted?.idNumber || 'not detected'}</span>
              </li>
              <li>
                Date of birth: <span className="font-medium">{ocrExtracted?.dateOfBirth || 'not detected'}</span>
              </li>
              <li>
                Date of issue: <span className="font-medium">{ocrExtracted?.dateOfIssue || 'not detected'}</span>
              </li>
            </ul>
            <p className="mt-2">
              Please go back to Step 3 and correct your details if they differ, or continue and an admin will review manually.
            </p>
          </div>
        )}

        {uploaded.passport_photo && livenessVerified !== true && (
          <div className="rounded-lg border border-fortune-ink/10 p-5">
            <h3 className="mb-3 font-semibold text-fortune-ink">Liveness check</h3>
            <LivenessCapture
              key={livenessAttempt}
              passportPhotoUrl={passportPhotoUrl!}
              onVerified={handleLivenessVerified}
            />
          </div>
        )}

        {livenessVerified === true && (
          <p className="rounded-lg bg-fortune-greenLight p-3 text-sm text-fortune-greenDark">
            Liveness check passed — your live photo matches your passport photo
            {livenessScore !== null && ` (${(livenessScore * 100).toFixed(0)}% match).`}
          </p>
        )}

        {error && <p className="field-error">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onBack}>Back</button>
          <button
            className="btn-primary flex-1"
            disabled={!allDocsUploaded || livenessVerified !== true || continuing}
            onClick={continueToPayment}
          >
            {continuing ? 'Continuing…' : 'Continue to payment'}
          </button>
        </div>
      </div>
    </WizardLayout>
  );
}
