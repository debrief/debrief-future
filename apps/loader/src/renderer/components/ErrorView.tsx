/**
 * Error view component showing actionable error messages.
 */

import { useTranslation } from 'react-i18next';
import type { LoaderError } from '../types/results';
import './ErrorView.css';

interface ErrorViewProps {
  error: LoaderError;
  onRetry?: () => void;
}

export function ErrorView({ error, onRetry }: ErrorViewProps) {
  const { t } = useTranslation();

  const handleClose = () => {
    window.close();
  };

  return (
    <div className="error-view">
      <div className="error-content">
        <div className="error-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="error-title">{t('errors.title')}</h2>

        <p className="error-message">{error.message}</p>

        {error.details && <pre className="error-details">{error.details}</pre>}

        {error.resolution && (
          <p className="error-resolution">{t('errors.resolution', { suggestion: error.resolution })}</p>
        )}

        <div className="error-actions">
          {onRetry && (
            <button type="button" className="error-btn error-btn-primary" onClick={onRetry}>
              {t('common.retry')}
            </button>
          )}
          <button type="button" className="error-btn error-btn-secondary" onClick={handleClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
