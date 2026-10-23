import { useState } from 'react';
import type { FormEvent } from 'react';

import type { ExtensionCredentials } from '../accountApi';

interface Props {
  busy: boolean;

  onLogin: (credentials: ExtensionCredentials) => Promise<void>;
}

export default function LoginForm({ busy, onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (busy || !email.trim() || !password) {
      return;
    }

    try {
      await onLogin({
        email,
        password,
      });
    } finally {
      setPassword('');
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <label>
        Email
        <input
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          value={email}
          disabled={busy}
          required
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label>
        Mật khẩu
        <input
          type="password"
          autoComplete="current-password"
          maxLength={128}
          value={password}
          disabled={busy}
          required
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <button type="submit" disabled={busy || !email.trim() || !password}>
        {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </button>
    </form>
  );
}
