import { useState } from 'react';
import type { FormEvent } from 'react';
import type { LoginAction } from './auth.types';

export function useLoginForm(
  onLogin: LoginAction,
  busy: boolean,
) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit =
    email.trim().length > 0 &&
    password.length > 0 &&
    !busy;

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canSubmit) return;

    const success = await onLogin({
      email,
      password,
    });

    if (success) {
      setPassword('');
    }
  }

  function togglePassword() {
    setShowPassword((visible) => !visible);
  }

  return {
    email,
    password,
    showPassword,
    canSubmit,
    setEmail,
    setPassword,
    togglePassword,
    submit,
  };
}