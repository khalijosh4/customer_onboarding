import { FormEvent, useState } from 'react';
import { apiClient, getApiErrorMessage } from '../api/client';
import { Application } from '../types';
import WizardLayout from '../components/WizardLayout';

interface Props {
  application: Application;
  onUpdated: (app: Application) => void;
}

export default function Step1Phone({ application, onUpdated }: Props) {
  const [phoneNumber, setPhoneNumber] = useState(application.phoneNumber || '');
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const sendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await apiClient.post('/otp/request', { phoneNumber });
      setOtpSent(true);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not send verification code'));
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await apiClient.post('/otp/verify', {
        phoneNumber,
        code,
        applicationId: application.id,
      });
      const { data } = await apiClient.get<Application>(`/applications/${application.id}`);
      onUpdated(data);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Verification failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <WizardLayout
      currentStep={1}
      title="Verify your mobile number"
      subtitle="We'll send a one-time code to confirm this number is yours."
    >
      {!otpSent ? (
        <form onSubmit={sendOtp} className="space-y-4">
          <div>
            <label className="field-label">Mobile number</label>
            <input
              className="field-input"
              placeholder="07XX XXX XXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
          </div>
          {error && <p className="field-error">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Sending code…' : 'Send verification code'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          <p className="text-sm text-fortune-ink/60">
            Enter the code sent to <span className="font-medium text-fortune-ink">{phoneNumber}</span>
          </p>
          <div>
            <label className="field-label">Verification code</label>
            <input
              className="field-input tracking-[0.3em]"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          {error && <p className="field-error">{error}</p>}
          <div className="flex gap-3">
            <button type="button" className="btn-secondary" onClick={() => setOtpSent(false)}>
              Change number
            </button>
            <button className="btn-primary flex-1" disabled={busy}>
              {busy ? 'Verifying…' : 'Verify & continue'}
            </button>
          </div>
        </form>
      )}
    </WizardLayout>
  );
}
