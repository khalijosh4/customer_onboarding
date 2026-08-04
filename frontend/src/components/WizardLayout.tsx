import { ReactNode } from 'react';
import StepIndicator from './StepIndicator';
import logo from '../assets/logo.webp';

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
      <header className="bg-gradient-to-r from-fortune-blue via-fortune-blueDark to-fortune-green">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <img src={logo} alt="Fortune Sacco" className="h-16 w-16 shrink-0 object-contain" />
          <div>
            <p className="font-display text-lg font-semibold leading-tight text-white">Fortune Sacco</p>
            <p className="text-xs text-white/75">Member Onboarding · Your Success, Our Success</p>
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
