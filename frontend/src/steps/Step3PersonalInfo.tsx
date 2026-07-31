import { FormEvent, useState } from 'react';
import { apiClient, getApiErrorMessage } from '../api/client';
import { Application } from '../types';
import WizardLayout from '../components/WizardLayout';

interface Props {
  application: Application;
  onUpdated: (app: Application) => void;
  onBack: () => void;
}

const KENYAN_COUNTIES = [
  'Nairobi', 'Kirinyaga', 'Kiambu', 'Murang\u2019a', 'Nyeri', 'Embu', 'Mombasa', 'Kisumu',
  'Nakuru', 'Machakos', 'Meru', 'Kakamega', 'Uasin Gishu', 'Kajiado', 'Other',
];

export default function Step3PersonalInfo({ application, onUpdated, onBack }: Props) {
  const [form, setForm] = useState({
    lastName: application.lastName || '',
    firstName: application.firstName || '',
    otherNames: application.otherNames || '',
    sex: application.sex || '',
    nationality: application.nationality || 'Kenyan',
    countryOfResidence: application.countryOfResidence || 'Kenya',
    countyOfResidence: application.countyOfResidence || '',
    cityOrTown: application.cityOrTown || '',
    maritalStatus: application.maritalStatus || '',
    dateOfBirth: application.dateOfBirth || '',
    alternativeMobileNumber: application.alternativeMobileNumber || '',
    documentIdType: application.documentIdType || 'national_id',
    documentIdNumber: application.documentIdNumber || '',
    documentIssueDate: application.documentIssueDate || '',
    documentExpiryDate: application.documentExpiryDate || '',
    residenceEstate: application.residenceEstate || '',
    physicalAddress: application.physicalAddress || '',
    nearestLandmark: application.nearestLandmark || '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await apiClient.put<Application>(
        `/applications/${application.id}/personal-info`,
        form,
      );
      onUpdated(data);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Please check your details'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <WizardLayout currentStep={3} title="Your personal information">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Last name / Surname">
            <input className="field-input" required value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
          </Field>
          <Field label="First name">
            <input className="field-input" required value={form.firstName} onChange={(e) => update('firstName', e.target.value)} />
          </Field>
          <Field label="Other names">
            <input className="field-input" value={form.otherNames} onChange={(e) => update('otherNames', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Sex">
            <select className="field-input" required value={form.sex} onChange={(e) => update('sex', e.target.value)}>
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
            </select>
          </Field>
          <Field label="Nationality">
            <input className="field-input" required value={form.nationality} onChange={(e) => update('nationality', e.target.value)} />
          </Field>
          <Field label="Marital status">
            <select className="field-input" required value={form.maritalStatus} onChange={(e) => update('maritalStatus', e.target.value)}>
              <option value="">Select</option>
              <option>Single</option>
              <option>Married</option>
              <option>Divorced</option>
              <option>Widowed</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Country of residence">
            <input className="field-input" required value={form.countryOfResidence} onChange={(e) => update('countryOfResidence', e.target.value)} />
          </Field>
          <Field label="County of residence">
            <select className="field-input" required value={form.countyOfResidence} onChange={(e) => update('countyOfResidence', e.target.value)}>
              <option value="">Select</option>
              {KENYAN_COUNTIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="City / Town">
            <input className="field-input" required value={form.cityOrTown} onChange={(e) => update('cityOrTown', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date of birth">
            <input type="date" className="field-input" required value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} />
          </Field>
          <Field label="Alternative mobile number (optional)">
            <input className="field-input" value={form.alternativeMobileNumber} onChange={(e) => update('alternativeMobileNumber', e.target.value)} />
          </Field>
        </div>

        <div className="rounded-lg border border-fortune-ink/10 p-4">
          <p className="mb-3 text-sm font-semibold text-fortune-ink">Document of identity</p>
          <div className="mb-4 flex gap-4">
            {[
              ['national_id', 'National ID'],
              ['passport', 'Passport'],
              ['other', 'Other'],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="documentIdType"
                  className="accent-fortune-green"
                  checked={form.documentIdType === value}
                  onChange={() => update('documentIdType', value)}
                />
                {label}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="National ID number">
              <input
                className="field-input"
                required
                inputMode="numeric"
                pattern="\d{7,8}"
                maxLength={8}
                placeholder="e.g. 42344860 (not the serial number)"
                value={form.documentIdNumber}
                onChange={(e) => update('documentIdNumber', e.target.value)}
              />
            </Field>
            <Field label="Date of issue">
              <input type="date" className="field-input" required value={form.documentIssueDate} onChange={(e) => update('documentIssueDate', e.target.value)} />
            </Field>
            <Field label="Expiry date (if applicable)">
              <input type="date" className="field-input" value={form.documentExpiryDate} onChange={(e) => update('documentExpiryDate', e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Estate / Residence">
            <input className="field-input" required value={form.residenceEstate} onChange={(e) => update('residenceEstate', e.target.value)} />
          </Field>
          <Field label="Physical address">
            <input className="field-input" required value={form.physicalAddress} onChange={(e) => update('physicalAddress', e.target.value)} />
          </Field>
          <Field label="Nearest landmark">
            <input className="field-input" required value={form.nearestLandmark} onChange={(e) => update('nearestLandmark', e.target.value)} />
          </Field>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
