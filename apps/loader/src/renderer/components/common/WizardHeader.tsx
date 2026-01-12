/**
 * Wizard header showing file being loaded and selected store.
 */

import { useTranslation } from 'react-i18next';
import './WizardHeader.css';

interface WizardHeaderProps {
  fileName: string;
  storeName?: string;
}

export function WizardHeader({ fileName, storeName }: WizardHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="wizard-header">
      <h1 className="wizard-title">{t('app.title')}</h1>
      <div className="wizard-context">
        <div className="wizard-file">
          <span className="wizard-label">{t('app.loading', { fileName })}</span>
        </div>
        {storeName && (
          <div className="wizard-store">
            <span className="wizard-store-label">Store: {storeName}</span>
          </div>
        )}
      </div>
      <hr className="wizard-divider" />
    </header>
  );
}
