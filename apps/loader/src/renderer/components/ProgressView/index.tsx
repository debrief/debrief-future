/**
 * Progress view component showing processing status.
 */

import { useTranslation } from 'react-i18next';
import './ProgressView.css';

interface ProgressViewProps {
  progress: number;
  statusMessage: string;
}

export function ProgressView({ progress, statusMessage }: ProgressViewProps) {
  const { t } = useTranslation();

  return (
    <div className="progress-view">
      <div className="progress-content">
        <h2 className="progress-title">{t('progress.title')}</h2>

        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress}%` }} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} />
        </div>

        <div className="progress-percent">{progress}%</div>
        <div className="progress-status">{statusMessage}</div>
      </div>
    </div>
  );
}
