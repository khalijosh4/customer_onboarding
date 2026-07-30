import { Application } from '../types';

export default function CompletionScreen({ application }: { application: Application }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-fortune-cream px-6">
      <div className="card max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-fortune-greenLight text-2xl text-fortune-green">
          ✓
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-fortune-ink">Application submitted</h1>
        <p className="mb-4 text-fortune-ink/60">
          Thank you for applying to join Fortune Sacco. Your reference number is:
        </p>
        <p className="mb-6 font-display text-xl font-semibold text-fortune-green">
          {application.referenceNumber}
        </p>
        <p className="text-sm text-fortune-ink/60">
          Our team will review your application and documents. You'll receive an SMS once your
          account has been approved and opened.
        </p>
      </div>
    </div>
  );
}
