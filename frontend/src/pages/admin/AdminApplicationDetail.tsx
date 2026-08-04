import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient, API_BASE_URL } from '../../api/client';
import { Application } from '../../types';

const SERVER_ROOT = API_BASE_URL.replace(/\/api\/?$/, '');

interface DocumentRow {
  id: string;
  kind: string;
  storagePath: string;
}

function documentUrl(doc: DocumentRow, applicationId: string) {
  const filename = doc.storagePath.split(/[\\/]/).pop();
  return `${SERVER_ROOT}/uploads/${applicationId}/${filename}`;
}

function Badge({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        ok ? 'bg-fortune-greenLight text-fortune-greenDark' : 'bg-fortune-terracotta/10 text-fortune-terracotta'
      }`}
    >
      {ok ? '✓' : '✕'} {label}
    </span>
  );
}

export default function AdminApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<(Application & { documents?: DocumentRow[] }) | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const load = async () => {
    const { data } = await apiClient.get(`/admin/applications/${id}`);
    setApp(data);
  };

  const approve = async () => {
    setBusy(true);
    await apiClient.post(`/admin/applications/${id}/approve`);
    setBusy(false);
    load();
  };

  const reject = async () => {
    setBusy(true);
    await apiClient.post(`/admin/applications/${id}/reject`, { reason: rejectReason });
    setBusy(false);
    setShowReject(false);
    load();
  };

  if (!app) return <p className="text-fortune-ink/60">Loading…</p>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/admin')} className="text-sm font-semibold text-fortune-green">
        ← Back to applications
      </button>

      <div className="card">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-fortune-ink">
              {app.firstName} {app.otherNames} {app.lastName}
            </h1>
            <p className="text-sm text-fortune-ink/50">{app.referenceNumber}</p>
          </div>
          <span className="rounded-full bg-fortune-ink/5 px-3 py-1 text-sm font-medium capitalize text-fortune-ink/70">
            {app.status.replace('_', ' ')}
          </span>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <Badge ok={app.phoneVerified} label="Phone verified" />
          <Badge ok={app.idOcrMatchesEnteredData} label="ID OCR match" />
          <Badge
            ok={app.iprsVerified}
            label={app.iprsResponse?.source === 'live' ? 'IPRS verified (live)' : 'IPRS verified'}
          />
          <Badge ok={app.livenessVerified} label="Liveness verified" />
          <Badge ok={app.paymentCompleted} label="Payment received" />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Section title="Personal">
            <Row label="Sex" value={app.sex} />
            <Row label="Nationality" value={app.nationality} />
            <Row label="Date of birth" value={app.dateOfBirth} />
            <Row label="Marital status" value={app.maritalStatus} />
            <Row label="ID / Passport number" value={app.documentIdNumber} />
            <Row label="IPRS full name" value={app.iprsResponse?.iprsFullName} />
            <Row label="IPRS date of birth" value={app.iprsResponse?.iprsDateOfBirth} />
            <Row label="IPRS serial number" value={app.iprsResponse?.iprsSerialNumber} />
            <Row label="County / Town" value={`${app.countyOfResidence}, ${app.cityOrTown}`} />
            <Row label="Physical address" value={app.physicalAddress} />
          </Section>

          <Section title="Employment">
            <Row label="Status" value={app.employmentStatus} />
            <Row label="Employer / Business" value={app.employerOrBusinessName} />
            <Row label="Monthly income (KES)" value={app.approximateMonthlyIncome?.toLocaleString()} />
          </Section>

          <Section title="Accounts, products & services">
            <Row label="Account type" value={app.accountType} />
            <Row label="Products" value={app.selectedProducts?.join(', ')} />
            <Row label="Shares" value={String(app.numberOfShares)} />
            <Row label="Services" value={app.selectedServices?.join(', ')} />
          </Section>

          <Section title="Referral & next of kin">
            <Row label="Referred by staff" value={app.referredByStaff ? `${app.referralStaffName} (${app.referralStaffPfNumber})` : 'No'} />
            <Row label="Next of kin" value={`${app.nextOfKinName} — ${app.nextOfKinRelationship}`} />
            <Row label="Next of kin phone" value={app.nextOfKinMobileNumber} />
          </Section>
        </div>

        {app.documents && app.documents.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 font-semibold text-fortune-ink">Documents</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {app.documents.map((doc) => (
                <div key={doc.id}>
                  <img
                    src={documentUrl(doc, app.id)}
                    alt={doc.kind}
                    className="h-32 w-full rounded-lg border border-fortune-ink/10 object-cover"
                  />
                  <p className="mt-1 text-center text-xs capitalize text-fortune-ink/50">
                    {doc.kind.replace(/_/g, ' ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {app.status === 'submitted' || app.status === 'under_review' ? (
          <div className="mt-8 flex gap-3 border-t border-fortune-ink/10 pt-6">
            <button className="btn-secondary" disabled={busy} onClick={() => setShowReject(true)}>
              Reject
            </button>
            <button className="btn-primary" disabled={busy} onClick={approve}>
              {busy ? 'Processing…' : 'Approve & push to CBS'}
            </button>
          </div>
        ) : app.status === 'approved' ? (
          <div className="mt-8 rounded-lg bg-fortune-greenLight p-4 text-sm text-fortune-greenDark">
            Approved{app.cbsCustomerNumber ? ` — CBS customer number: ${app.cbsCustomerNumber}` : ''}
          </div>
        ) : app.status === 'rejected' ? (
          <div className="mt-8 rounded-lg bg-fortune-terracotta/10 p-4 text-sm text-fortune-terracotta">
            Rejected — {app.rejectionReason}
          </div>
        ) : null}

        {showReject && (
          <div className="mt-4 space-y-3 rounded-lg border border-fortune-ink/10 p-4">
            <label className="field-label">Reason for rejection</label>
            <textarea
              className="field-input"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button className="btn-secondary" onClick={() => setShowReject(false)}>Cancel</button>
              <button className="btn-primary" disabled={!rejectReason || busy} onClick={reject}>
                Confirm rejection
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 font-semibold text-fortune-ink">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-fortune-ink/50">{label}</span>
      <span className="font-medium text-fortune-ink">{value || '—'}</span>
    </div>
  );
}
