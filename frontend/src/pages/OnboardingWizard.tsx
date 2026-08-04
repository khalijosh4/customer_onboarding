import { useEffect, useState } from 'react';
import { useOnboarding } from '../context/OnboardingContext';
import { Application } from '../types';
import Step1Phone from '../steps/Step1Phone';
import Step2Consent from '../steps/Step2Consent';
import Step3PersonalInfo from '../steps/Step3PersonalInfo';
import Step4Employment from '../steps/Step4Employment';
import Step5Products from '../steps/Step5Products';
import Step6Referral from '../steps/Step6Referral';
import Step7NextOfKin from '../steps/Step7NextOfKin';
import Step8Documents from '../steps/Step8Documents';
import Step9Payment from '../steps/Step9Payment';
import CompletionScreen from '../steps/CompletionScreen';

export default function OnboardingWizard() {
  const { application, loading, loadError, setApplication, retry } = useOnboarding();
  const [viewStep, setViewStep] = useState(1);

  useEffect(() => {
    if (application) setViewStep(application.currentStep);
  }, [application?.id]);

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fortune-cream px-6 text-center">
        <p className="field-error">{loadError}</p>
        <button type="button" className="btn-primary" onClick={() => retry()}>
          Try again
        </button>
      </div>
    );
  }

  if (loading || !application) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fortune-cream">
        <p className="text-fortune-ink/60">Loading your application…</p>
      </div>
    );
  }

  const handleUpdated = (updated: Application, nextStep: number) => {
    setApplication(updated);
    setViewStep(nextStep);
  };

  const goBack = () => setViewStep((s) => Math.max(1, s - 1));

  if (application.status === 'submitted') {
    return <CompletionScreen application={application} />;
  }

  const commonProps = { application, onBack: goBack };

  switch (viewStep) {
    case 1:
      return <Step1Phone {...commonProps} onUpdated={(app) => handleUpdated(app, 2)} />;
    case 2:
      return <Step2Consent {...commonProps} onUpdated={(app) => handleUpdated(app, 3)} />;
    case 3:
      return <Step3PersonalInfo {...commonProps} onUpdated={(app) => handleUpdated(app, 4)} />;
    case 4:
      return <Step4Employment {...commonProps} onUpdated={(app) => handleUpdated(app, 5)} />;
    case 5:
      return <Step5Products {...commonProps} onUpdated={(app) => handleUpdated(app, 6)} />;
    case 6:
      return <Step6Referral {...commonProps} onUpdated={(app) => handleUpdated(app, 7)} />;
    case 7:
      return <Step7NextOfKin {...commonProps} onUpdated={(app) => handleUpdated(app, 8)} />;
    case 8:
      return <Step8Documents {...commonProps} onUpdated={(app) => handleUpdated(app, 9)} />;
    case 9:
      return <Step9Payment {...commonProps} onUpdated={(app) => handleUpdated(app, 9)} />;
    default:
      return <Step1Phone {...commonProps} onUpdated={(app) => handleUpdated(app, 2)} />;
  }
}
