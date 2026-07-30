import { useState } from 'react';
import { apiClient, getApiErrorMessage } from '../api/client';
import { Application } from '../types';
import WizardLayout from '../components/WizardLayout';

interface Props {
  application: Application;
  onUpdated: (app: Application) => void;
  onBack: () => void;
}

export default function Step9Payment({ application, onUpdated, onBack }: Props) {
  const [status, setStatus] = useState<'idle' | 'pushed' | 'polling'>('idle');
  const [amount, setAmount] = useState<number | null>(null);
  const [error, setError] = useState('');

  const initiate = async () => {
    setError('');
    try {
      const { data } = await apiClient.post(`/payments/${application.id}/mpesa/stk-push`);
      setAmount(data.amount);
      setStatus('pushed');
      pollForCompletion();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not start payment'));
    }
  };

  const pollForCompletion = () => {
    setStatus('polling');
    const interval = setInterval(async () => {
      const { data } = await apiClient.get<Application>(`/applications/${application.id}`);
      if (data.paymentCompleted) {
        clearInterval(interval);
        onUpdated(data);
      }
    }, 6000);

    // Stop polling automatically after 3 minutes to avoid a runaway timer.
    setTimeout(() => clearInterval(interval), 3 * 60 * 1000);
  };

  // Convenience for local development when Daraja credentials aren't configured yet.
  const devSimulate = async () => {
    const { data } = await apiClient.post<Application>(`/payments/${application.id}/mpesa/dev-simulate`);
    onUpdated(data);
  };

  return (
    <WizardLayout
      currentStep={9}
      title="Complete your account opening"
      subtitle="We'll send a payment prompt to your phone via M-Pesa."
    >
      <div className="space-y-5">
        <div className="rounded-lg bg-fortune-greenLight p-4 text-sm text-fortune-greenDark">
          Based on your selected shares, an M-Pesa prompt will be sent to{' '}
          <span className="font-semibold">{application.phoneNumber}</span>.
        </div>

        {status === 'idle' && (
          <button className="btn-primary w-full" onClick={initiate}>
            Send M-Pesa payment prompt
          </button>
        )}

        {(status === 'pushed' || status === 'polling') && (
          <div className="space-y-3 text-center">
            <p className="text-fortune-ink/70">
              Check your phone {amount ? `and pay KES ${amount.toLocaleString()}` : ''} to complete
              your account opening.
            </p>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-fortune-green/20 border-t-fortune-green" />
            <p className="text-xs text-fortune-ink/40">Waiting for confirmation…</p>
            <button type="button" onClick={devSimulate} className="text-xs text-fortune-ink/40 underline">
              (Dev only) Simulate successful payment
            </button>
          </div>
        )}

        {error && <p className="field-error">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onBack}>Back</button>
        </div>
      </div>
    </WizardLayout>
  );
}
