import { FormEvent, useState } from 'react';
import { apiClient, getApiErrorMessage } from '../api/client';
import { Application } from '../types';
import WizardLayout from '../components/WizardLayout';

interface Props {
  application: Application;
  onUpdated: (app: Application) => void;
  onBack: () => void;
}

const EMPLOYMENT_OPTIONS = [
  { value: 'casual', label: 'Casual' },
  { value: 'self_employed', label: 'Self employed' },
  { value: 'formally_employed', label: 'Formally employed' },
  { value: 'contract', label: 'Contract' },
  { value: 'retired', label: 'Retired' },
];

export default function Step4Employment({ application, onUpdated, onBack }: Props) {
  const [status, setStatus] = useState(application.employmentStatus || 'formally_employed');
  const [employerOrBusinessName, setEmployerOrBusinessName] = useState(application.employerOrBusinessName || '');
  const [employerPhone, setEmployerPhone] = useState(application.employerPhone || '');
  const [workAddress, setWorkAddress] = useState(application.workAddress || '');
  const [income, setIncome] = useState(application.approximateMonthlyIncome?.toString() || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const needsEmployerDetails = ['formally_employed', 'contract', 'retired'].includes(status);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await apiClient.put<Application>(`/applications/${application.id}/employment`, {
        employmentStatus: status,
        employerOrBusinessName: needsEmployerDetails ? employerOrBusinessName : undefined,
        employerPhone: employerPhone || undefined,
        workAddress: needsEmployerDetails ? workAddress : undefined,
        approximateMonthlyIncome: Number(income),
      });
      onUpdated(data);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Please check your details'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <WizardLayout currentStep={4} title="Employment details">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="field-label">Employment status</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {EMPLOYMENT_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setStatus(opt.value as any)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                  status === opt.value
                    ? 'border-fortune-green bg-fortune-greenLight text-fortune-greenDark'
                    : 'border-fortune-ink/15 text-fortune-ink/70 hover:border-fortune-green/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {needsEmployerDetails && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">
                {status === 'retired' ? 'Former employer name' : 'Business / Employer name'}
              </label>
              <input
                className="field-input"
                required
                value={employerOrBusinessName}
                onChange={(e) => setEmployerOrBusinessName(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Employer phone (optional)</label>
              <input className="field-input" value={employerPhone} onChange={(e) => setEmployerPhone(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">Work address</label>
              <input className="field-input" required value={workAddress} onChange={(e) => setWorkAddress(e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <label className="field-label">Approximate monthly income (KES)</label>
          <input
            type="number"
            min={0}
            className="field-input"
            required
            value={income}
            onChange={(e) => setIncome(e.target.value)}
          />
        </div>

        {error && <p className="field-error">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onBack}>Back</button>
          <button className="btn-primary flex-1" disabled={busy}>{busy ? 'Saving…' : 'Continue'}</button>
        </div>
      </form>
    </WizardLayout>
  );
}
