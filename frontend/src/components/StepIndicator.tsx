const STEP_LABELS = [
  'Phone',
  'Consent',
  'Personal',
  'Employment',
  'Products',
  'Referral',
  'Next of Kin',
  'Documents',
  'Payment',
];

export default function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-fortune-green">
          Step {currentStep} of {STEP_LABELS.length}
        </span>
        <span className="text-sm text-fortune-ink/60">{STEP_LABELS[currentStep - 1]}</span>
      </div>
      <div className="flex gap-1.5">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = idx + 1;
          const isComplete = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <div
              key={label}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                isComplete || isCurrent ? 'bg-fortune-green' : 'bg-fortune-ink/10'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
