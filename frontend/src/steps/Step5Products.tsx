import { FormEvent, useEffect, useState } from 'react';
import { apiClient, getApiErrorMessage } from '../api/client';
import { Application, CatalogResponse } from '../types';
import WizardLayout from '../components/WizardLayout';

interface Props {
  application: Application;
  onUpdated: (app: Application) => void;
  onBack: () => void;
}

export default function Step5Products({ application, onUpdated, onBack }: Props) {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [accountType, setAccountType] = useState(application.accountType || '');
  const [selectedProducts, setSelectedProducts] = useState<string[]>(application.selectedProducts || []);
  const [numberOfShares, setNumberOfShares] = useState(application.numberOfShares || 10);
  const [standingOrderEnabled, setStandingOrderEnabled] = useState(application.standingOrderEnabled || false);
  const [standingOrderAmount, setStandingOrderAmount] = useState(application.standingOrderAmount?.toString() || '');
  const [standingOrderFrequency, setStandingOrderFrequency] = useState(application.standingOrderFrequency || 'monthly');
  const [selectedServices, setSelectedServices] = useState<string[]>(application.selectedServices || []);
  const [businessName, setBusinessName] = useState(application.businessName || '');
  const [paybillNumbers, setPaybillNumbers] = useState<string[]>(
    application.businessPaybillNumbers?.length ? application.businessPaybillNumbers : ['', ''],
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient.get<CatalogResponse>('/catalog/accounts-products-services').then((res) => setCatalog(res.data));
  }, []);

  const toggle = (list: string[], value: string, setList: (v: string[]) => void) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const needsPaybill = selectedServices.includes('business_paybill');
  const shareValue = catalog?.shareValueKes || 100;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await apiClient.put<Application>(`/applications/${application.id}/products-services`, {
        accountType,
        selectedProducts,
        numberOfShares,
        standingOrderEnabled,
        standingOrderAmount: standingOrderEnabled ? Number(standingOrderAmount) : undefined,
        standingOrderFrequency: standingOrderEnabled ? standingOrderFrequency : undefined,
        selectedServices,
        businessName: needsPaybill ? businessName : undefined,
        businessPaybillNumbers: needsPaybill ? paybillNumbers.filter(Boolean) : undefined,
      });
      onUpdated(data);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Please check your selections'));
    } finally {
      setBusy(false);
    }
  };

  if (!catalog) {
    return (
      <WizardLayout currentStep={5} title="Accounts, products & services">
        <p className="text-fortune-ink/60">Loading products…</p>
      </WizardLayout>
    );
  }

  return (
    <WizardLayout currentStep={5} title="Accounts, products & services">
      <form onSubmit={submit} className="space-y-8">
        <section>
          <h3 className="mb-3 font-semibold text-fortune-ink">Choose an account to operate</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {catalog.accountTypes.map((acc) => (
              <label
                key={acc.code}
                className={`cursor-pointer rounded-lg border p-4 transition ${
                  accountType === acc.code ? 'border-fortune-green bg-fortune-greenLight' : 'border-fortune-ink/10'
                }`}
              >
                <input
                  type="radio"
                  name="accountType"
                  className="sr-only"
                  checked={accountType === acc.code}
                  onChange={() => setAccountType(acc.code)}
                />
                <p className="font-semibold text-fortune-ink">{acc.name}</p>
                <p className="mt-1 text-sm text-fortune-ink/60">{acc.description}</p>
              </label>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-semibold text-fortune-ink">Products (optional, select any)</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {catalog.products.map((p) => (
              <label
                key={p.code}
                className={`cursor-pointer rounded-lg border p-4 transition ${
                  selectedProducts.includes(p.code) ? 'border-fortune-green bg-fortune-greenLight' : 'border-fortune-ink/10'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedProducts.includes(p.code)}
                  onChange={() => toggle(selectedProducts, p.code, setSelectedProducts)}
                />
                <p className="font-semibold text-fortune-ink">{p.name}</p>
                <p className="mt-1 text-sm text-fortune-ink/60">{p.description}</p>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-fortune-ink/10 p-4">
          <h3 className="mb-1 font-semibold text-fortune-ink">Shares</h3>
          <p className="mb-3 text-sm text-fortune-ink/60">Each share costs KES {shareValue}.</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              className="field-input w-32"
              value={numberOfShares}
              onChange={(e) => setNumberOfShares(Number(e.target.value))}
            />
            <span className="text-sm text-fortune-ink/60">
              = KES {(numberOfShares * shareValue).toLocaleString()}
            </span>
          </div>
        </section>

        <section className="rounded-lg border border-fortune-ink/10 p-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 accent-fortune-green"
              checked={standingOrderEnabled}
              onChange={(e) => setStandingOrderEnabled(e.target.checked)}
            />
            <span className="font-semibold text-fortune-ink">Set up a standing order (optional)</span>
          </label>
          {standingOrderEnabled && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label">Amount (KES)</label>
                <input
                  type="number"
                  min={1}
                  className="field-input"
                  required
                  value={standingOrderAmount}
                  onChange={(e) => setStandingOrderAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Frequency</label>
                <select
                  className="field-input"
                  value={standingOrderFrequency}
                  onChange={(e) => setStandingOrderFrequency(e.target.value as any)}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-3 font-semibold text-fortune-ink">Services</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {catalog.services.map((s) => (
              <label
                key={s.code}
                className={`cursor-pointer rounded-lg border p-4 transition ${
                  selectedServices.includes(s.code) ? 'border-fortune-green bg-fortune-greenLight' : 'border-fortune-ink/10'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedServices.includes(s.code)}
                  onChange={() => toggle(selectedServices, s.code, setSelectedServices)}
                />
                <p className="font-semibold text-fortune-ink">{s.name}</p>
                <p className="mt-1 text-sm text-fortune-ink/60">{s.description}</p>
              </label>
            ))}
          </div>

          {needsPaybill && (
            <div className="mt-4 space-y-4 rounded-lg border border-fortune-ink/10 p-4">
              <div>
                <label className="field-label">Business name</label>
                <input className="field-input" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Mobile numbers to receive payments (at least 2)</label>
                <div className="space-y-2">
                  {paybillNumbers.map((num, idx) => (
                    <input
                      key={idx}
                      className="field-input"
                      placeholder={`Mobile number ${idx + 1}`}
                      required
                      value={num}
                      onChange={(e) => {
                        const copy = [...paybillNumbers];
                        copy[idx] = e.target.value;
                        setPaybillNumbers(copy);
                      }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-2 text-sm font-semibold text-fortune-green"
                  onClick={() => setPaybillNumbers([...paybillNumbers, ''])}
                >
                  + Add another number
                </button>
              </div>
            </div>
          )}
        </section>

        {error && <p className="field-error">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onBack}>Back</button>
          <button className="btn-primary flex-1" disabled={busy || !accountType}>
            {busy ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </form>
    </WizardLayout>
  );
}
