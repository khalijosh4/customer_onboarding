import { useState } from 'react';
import { apiClient, getApiErrorMessage } from '../api/client';
import { Application } from '../types';
import WizardLayout from '../components/WizardLayout';
import TermsModal from '../components/TermsModal';

interface Props {
  application: Application;
  onUpdated: (app: Application) => void;
  onBack: () => void;
}

export default function Step2Consent({ application, onUpdated, onBack }: Props) {
  const [consent, setConsent] = useState(application.dataCollectionConsent || false);
  const [termsAccepted, setTermsAccepted] = useState(application.termsAccepted || false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canContinue = consent && termsAccepted;

  const handleContinue = async () => {
    if (!canContinue) return;
    setError('');
    setBusy(true);
    try {
      const { data } = await apiClient.put<Application>(`/applications/${application.id}/consent`, {
        dataCollectionConsent: consent,
        termsAccepted,
      });
      onUpdated(data);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not save your consent'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <WizardLayout
      currentStep={2}
      title="Consent to proceed"
      subtitle="Please review and accept the following before we collect your details."
    >
      <div className="space-y-4">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-fortune-ink/10 p-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-fortune-green"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span className="text-sm text-fortune-ink/80">
            I consent to Fortune Sacco collecting and processing my personal information for the
            purpose of membership registration and account opening.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-fortune-ink/10 p-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-fortune-green"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          <span className="text-sm text-fortune-ink/80">
            I have read and agree to the{' '}
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="font-semibold text-fortune-green underline underline-offset-2"
            >
              Terms &amp; Conditions
            </button>
            .
          </span>
        </label>

        {!canContinue && (
          <div className="rounded-lg border border-fortune-terracotta/30 bg-fortune-terracotta/5 p-3 text-sm text-fortune-terracotta">
            You cannot continue until you have ticked the consent box and accepted the Terms &amp;
            Conditions above.
          </div>
        )}

        {error && <p className="field-error">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onBack}>
            Back
          </button>
          <button className="btn-primary flex-1" disabled={!canContinue || busy} onClick={handleContinue}>
            {busy ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </WizardLayout>
  );
}
