import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Application } from '../../types';

const STATUS_FILTERS: { label: string; value: Application['status'] | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Under review', value: 'under_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-fortune-ink/5 text-fortune-ink/50',
  submitted: 'bg-fortune-gold/15 text-fortune-goldDark',
  under_review: 'bg-fortune-gold/15 text-fortune-goldDark',
  approved: 'bg-fortune-greenLight text-fortune-greenDark',
  rejected: 'bg-fortune-terracotta/10 text-fortune-terracotta',
};

export default function AdminDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState<Application['status'] | ''>('submitted');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const load = async () => {
    setLoading(true);
    const { data } = await apiClient.get<Application[]>('/admin/applications', {
      params: filter ? { status: filter } : {},
    });
    setApplications(data);
    setLoading(false);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-fortune-ink">Membership applications</h1>

      <div className="mb-6 flex gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === f.value ? 'bg-fortune-green text-white' : 'bg-white text-fortune-ink/60 hover:bg-fortune-greenLight'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-fortune-ink/60">Loading…</p>
      ) : applications.length === 0 ? (
        <p className="text-fortune-ink/60">No applications found for this filter.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-fortune-ink/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-fortune-ink/5 text-xs uppercase tracking-wide text-fortune-ink/50">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Account type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-fortune-ink/5">
              {applications.map((app) => (
                <tr key={app.id}>
                  <td className="px-4 py-3 font-medium text-fortune-ink">{app.referenceNumber}</td>
                  <td className="px-4 py-3">{app.firstName} {app.lastName}</td>
                  <td className="px-4 py-3">{app.phoneNumber}</td>
                  <td className="px-4 py-3 capitalize">{app.accountType}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[app.status]}`}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/applications/${app.id}`} className="font-semibold text-fortune-green">
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
