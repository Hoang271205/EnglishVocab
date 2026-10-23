import { useId } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
} from 'react';

interface FormFieldProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  trailing?: ReactNode;
}

export default function FormField({
  id,
  label,
  trailing,
  className = '',
  ...props
}: FormFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className="ui-field">
      <label htmlFor={fieldId}>{label}</label>

      <div
        className={[
          'ui-input-wrap',
          trailing ? 'ui-input-wrap--trailing' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <input
          {...props}
          id={fieldId}
          className={`ui-input ${className}`.trim()}
        />

        {trailing && (
          <div className="ui-input-trailing">
            {trailing}
          </div>
        )}
      </div>
    </div>
  );
}