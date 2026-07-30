import { FormEvent, useState } from 'react';
import { apiClient, getApiErrorMessage } from '../api/client';
import { Application } from '../types';
import WizardLayout from '../components/WizardLayout';

interface Props {
  application: Application;
  onUpdated: (app: Application) => void;
  onBack: () => void;
}

export default function Step6Referral({ application, onUpdated, onBack }: Props) {
  const [referredByStaff, setReferredByStaff] = useState(application.referredByStaff || false);
  const [pfNumber, setPfNumber] = useState(application.referralStaffPfNumber || '');
  const [staffName, setStaffName] = useState(application.referralStaffName || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await apiClient.put<Application>(`/applications/${application.id}/referral`, {
        referredByStaff,
        referralStaffPfNumber: referredByStaff ? pfNumber : undefined,
        referralStaffName: referredByStaff ? staffName : undefined,
      });
      onUpdated(data);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Please check your details'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <WizardLayout
      currentStep={6}
      title="Were you referred?"
      subtitle="Let us know if a Fortune Sacco staff member referred you."
    >
      <form onSubmit={submit} className="space-y-5">
        <label className="flex items-center gap-3 rounded-lg border border-fortune-ink/10 p-4">
          <input
            type="checkbox"
            className="h-4 w-4 accent-fortune-green"
            checked={referredByStaff}
            onChange={(e) => setReferredByStaff(e.target.checked)}
          />
          <span className="font-medium text-fortune-ink">I was referred by a Fortune Sacco staff member</span>
        </label>

        {referredByStaff && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Staff PF number</label>
              <input className="field-input" required value={pfNumber} onChange={(e) => setPfNumber(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Staff name</label>
              <input className="field-input" required value={staffName} onChange={(e) => setStaffName(e.target.value)} />
            </div>
          </div>
        )}

        {error && <p className="field-error">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onBack}>Back</button>
          <button className="btn-primary flex-1" disabled={busy}>{busy ? 'Saving…' : 'Continue'}</button>
        </div>
      </form>
    </WizardLayout>
  );
}
