const TERMS_SECTIONS = [
  {
    heading: '1. Membership',
    body: 'By submitting this application, you are applying to become a member of Fortune Sacco Society Ltd and agree to be bound by its by-laws, as amended from time to time.',
  },
  {
    heading: '2. Accuracy of information',
    body: 'You confirm that all information and documents provided in this application are true, complete, and belong to you. Providing false information may lead to rejection of your application or termination of membership.',
  },
  {
    heading: '3. Data collection and use',
    body: 'You consent to Fortune Sacco collecting, storing, and processing your personal data (including your national ID/passport details, photographs, and biometric liveness data) for the purposes of identity verification, account opening, credit assessment, and regulatory compliance with SASRA requirements.',
  },
  {
    heading: '4. Identity verification',
    body: 'You authorize Fortune Sacco to verify your identity details against government records (including IPRS) and to use automated document and facial-liveness checks as part of onboarding.',
  },
  {
    heading: '5. Shares and deposits',
    body: 'Membership requires the purchase of a minimum number of shares as set out in Step 5. Shares and deposits are subject to the Sacco\u2019s by-laws and applicable withdrawal notice periods.',
  },
  {
    heading: '6. Fees and charges',
    body: 'You agree to pay the applicable account opening fee via M-Pesa as prompted in Step 9. Fees are non-refundable once your account has been opened.',
  },
  {
    heading: '7. Communication',
    body: 'You consent to receive SMS, email, and in-app notifications from Fortune Sacco relating to your account, statutory notices, and product offers. You may opt out of marketing communication at any time.',
  },
  {
    heading: '8. Data protection',
    body: 'Your data will be handled in accordance with the Kenya Data Protection Act, 2019. You have the right to access, correct, or request deletion of your data, subject to statutory retention requirements.',
  },
];

export default function TermsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-fortune-ink/50 p-0 sm:items-center sm:p-6">
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-xl font-semibold text-fortune-ink">Terms &amp; Conditions</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-fortune-ink/50 hover:bg-fortune-ink/5"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4 text-sm leading-relaxed text-fortune-ink/80">
          {TERMS_SECTIONS.map((section) => (
            <div key={section.heading}>
              <p className="mb-1 font-semibold text-fortune-ink">{section.heading}</p>
              <p>{section.body}</p>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="btn-primary mt-6 w-full">
          Close
        </button>
      </div>
    </div>
  );
}
