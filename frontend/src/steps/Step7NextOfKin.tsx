import { FormEvent, useState } from 'react';
import { apiClient, getApiErrorMessage } from '../api/client';
import { Application } from '../types';
import WizardLayout from '../components/WizardLayout';

interface Props {
  application: Application;
  onUpdated: (app: Application) => void;
  onBack: () => void;
}

const RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Relative', 'Friend', 'Other'];

export default function Step7NextOfKin({ application, onUpdated, onBack }: Props) {
  const [name, setName] = useState(application.nextOfKinName || '');
  const [relationship, setRelationship] = useState(application.nextOfKinRelationship || '');
  const [mobile, setMobile] = useState(application.nextOfKinMobileNumber || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await apiClient.put<Application>(`/applications/${application.id}/next-of-kin`, {
        nextOfKinName: name,
        nextOfKinRelationship: relationship,
        nextOfKinMobileNumber: mobile,
      });
      onUpdated(data);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Please check your details'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <WizardLayout currentStep={7} title="Next of kin / nominee">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="field-label">Next of kin name</label>
          <input className="field-input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Relationship</label>
          <select className="field-input" required value={relationship} onChange={(e) => setRelationship(e.target.value)}>
            <option value="">Select</option>
            {RELATIONSHIPS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Mobile number</label>
          <input className="field-input" required value={mobile} onChange={(e) => setMobile(e.target.value)} />
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
