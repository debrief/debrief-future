/**
 * Success view component showing load result.
 */

import { useTranslation } from 'react-i18next';
import type { LoadResult } from '../types/results';
import './SuccessView.css';

interface SuccessViewProps {
  result: LoadResult;
}

export function SuccessView({ result }: SuccessViewProps) {
  const { t } = useTranslation();

  const handleClose = () => {
    window.close();
  };

  return (
    <div className="success-view">
      <div className="success-content">
        <div className="success-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="success-title">{t('success.title')}</h2>

        <p className="success-message">
          {t('success.message', {
            featureCount: result.featuresLoaded,
            plotName: result.plotName,
          })}
        </p>

        <div className="success-details">
          <div className="success-detail">
            <span className="success-detail-label">{t('success.storeName', { storeName: result.storeName })}</span>
          </div>
          <div className="success-detail success-detail-provenance">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="success-detail-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{t('success.provenanceRecorded')}</span>
          </div>
        </div>

        <button type="button" className="success-close-btn" onClick={handleClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}
