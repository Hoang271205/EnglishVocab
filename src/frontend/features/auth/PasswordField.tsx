import { useState } from 'react';
import FormField from '../../components/ui/FormField';
import Icon from '../../components/ui/Icon';
interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}
export default function PasswordField({
  value,
  onChange,
  label = 'Mật khẩu mới',
  disabled = false,
}: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField
      label={label}
      name={label === 'Xác nhận mật khẩu' ? 'password-confirm' : 'new-password'}
      type={visible ? 'text' : 'password'}
      autoComplete="new-password"
      minLength={12}
      maxLength={128}
      required
      disabled={disabled}
      value={value}
      placeholder="Ít nhất 12 ký tự"
      onChange={(e) => onChange(e.target.value)}
      trailing={
        <button
          className="login-password-toggle"
          type="button"
          disabled={disabled}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} />
        </button>
      }
    />
  );
}
