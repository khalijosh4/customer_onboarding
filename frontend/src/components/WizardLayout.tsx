import { ReactNode } from 'react';
import StepIndicator from './StepIndicator';

export default function WizardLayout({
  currentStep,
  title,
  subtitle,
  children,
}: {
  currentStep: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-fortune-cream">
      <header className="border-b border-fortune-ink/10 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fortune-green font-display text-lg font-semibold text-white">
            F
          </div>
          <div>
            <p className="font-display text-lg font-semibold leading-tight text-fortune-ink">
              Fortune Sacco
            </p>
            <p className="text-xs text-fortune-ink/50">Member Onboarding · Shilingi by shilingi</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <StepIndicator currentStep={currentStep} />
        <div className="card">
          <h1 className="mb-1 text-2xl font-semibold text-fortune-ink">{title}</h1>
          {subtitle && <p className="mb-6 text-fortune-ink/60">{subtitle}</p>}
          {!subtitle && <div className="mb-6" />}
          {children}
        </div>
      </main>
    </div>
  );
}
