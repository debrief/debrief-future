/**
 * Tab content for creating a new plot.
 */

import { useTranslation } from 'react-i18next';
import type { NewPlotForm } from '../../types/forms';
import './CreateNewTab.css';

interface CreateNewTabProps {
  form: NewPlotForm;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
}

export function CreateNewTab({ form, onNameChange, onDescriptionChange }: CreateNewTabProps) {
  const { t } = useTranslation();

  return (
    <div className="create-new-tab">
      <div className="form-field">
        <label htmlFor="plot-name" className="form-label">
          {t('newPlot.name')}
        </label>
        <input
          id="plot-name"
          type="text"
          className={`form-input ${form.errors.name ? 'form-input-error' : ''}`}
          placeholder={t('newPlot.namePlaceholder')}
          value={form.name}
          onChange={(e) => onNameChange(e.target.value)}
          autoFocus
        />
        {form.errors.name && <span className="form-error">{form.errors.name}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="plot-description" className="form-label">
          {t('newPlot.description')}
        </label>
        <textarea
          id="plot-description"
          className="form-input form-textarea"
          placeholder={t('newPlot.descriptionPlaceholder')}
          value={form.description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}
