/**
 * Wizard navigation buttons (Back, Cancel, Next, Load).
 */

import { useTranslation } from 'react-i18next';
import './WizardNavigation.css';

interface WizardNavigationProps {
  showBack?: boolean;
  showNext?: boolean;
  showLoad?: boolean;
  nextDisabled?: boolean;
  loadDisabled?: boolean;
  onBack?: () => void;
  onCancel: () => void;
  onNext?: () => void;
  onLoad?: () => void;
}

export function WizardNavigation({
  showBack = false,
  showNext = false,
  showLoad = false,
  nextDisabled = false,
  loadDisabled = false,
  onBack,
  onCancel,
  onNext,
  onLoad,
}: WizardNavigationProps) {
  const { t } = useTranslation();

  return (
    <footer className="wizard-nav">
      <div className="wizard-nav-left">
        {showBack && (
          <button type="button" className="wizard-btn wizard-btn-secondary" onClick={onBack}>
            &lt; {t('common.back')}
          </button>
        )}
      </div>
      <div className="wizard-nav-right">
        <button type="button" className="wizard-btn wizard-btn-secondary" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        {showNext && (
          <button
            type="button"
            className="wizard-btn wizard-btn-primary"
            disabled={nextDisabled}
            onClick={onNext}
          >
            {t('common.next')} &gt;
          </button>
        )}
        {showLoad && (
          <button
            type="button"
            className="wizard-btn wizard-btn-primary"
            disabled={loadDisabled}
            onClick={onLoad}
          >
            {t('common.load')}
          </button>
        )}
      </div>
    </footer>
  );
}
