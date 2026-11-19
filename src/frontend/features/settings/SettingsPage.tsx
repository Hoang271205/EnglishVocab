import { useEffect, useState } from 'react';
import type { AuthUser } from '../auth/auth.types';
import { apiRequest } from '../../api/client';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import FormField from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import StatusMessage from '../../components/ui/StatusMessage';
import Icon from '../../components/ui/Icon';

type SettingsSection = 'profile' | 'password';
function currentSection(): SettingsSection {
  return new URL(window.location.href).searchParams.get('section') ===
    'password'
    ? 'password'
    : 'profile';
}
function sectionUrl(section: SettingsSection) {
  const url = new URL(window.location.href);
  url.searchParams.set('tab', 'settings');
  url.searchParams.set('section', section);
  return url.pathname + url.search + url.hash;
}

export default function SettingsPage({
  user,
  onUserChanged,
}: {
  user: AuthUser;
  onUserChanged: (user: AuthUser) => void;
}) {
  const [profileSaved, setProfileSaved] = useState(false);
  const [section, setSection] = useState<SettingsSection>(currentSection);
  useEffect(() => {
    const restore = () => setSection(currentSection());
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  return (
    <section className="settings-page" aria-labelledby="settings-title">
      <header className="settings-heading">
        <p className="eyebrow">HỒ SƠ CỦA BẠN</p>
        <h1 id="settings-title">Cài đặt cá nhân</h1>
        <p>Quản lý thông tin hiển thị và bảo vệ tài khoản của bạn.</p>
      </header>
      <div className="settings-layout">
        <nav className="settings-navigation" aria-label="Cài đặt cá nhân">
          {(
            [
              { id: 'profile', label: 'Thông tin cá nhân', icon: 'user' },
              { id: 'password', label: 'Đổi mật khẩu', icon: 'lock' },
            ] as const
          ).map((item) => (
            <a
              key={item.id}
              href={sectionUrl(item.id)}
              aria-current={section === item.id ? 'page' : undefined}
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return;
                event.preventDefault();
                if (section !== item.id)
                  window.history.pushState(
                    window.history.state,
                    '',
                    sectionUrl(item.id),
                  );
                setSection(item.id);
              }}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="settings-content">
          <div hidden={section !== 'profile'}>
            {profileSaved && (
              <StatusMessage>Đã lưu hồ sơ cá nhân.</StatusMessage>
            )}
            <ProfileForm
              key={user.profileRevision ?? 0}
              user={user}
              onSaved={(next) => {
                setProfileSaved(true);
                onUserChanged(next);
              }}
            />
          </div>
          <div hidden={section !== 'password'}>
            <PasswordForm onSaved={onUserChanged} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfileForm({
  user,
  onSaved,
}: {
  user: AuthUser;
  onSaved: (user: AuthUser) => void;
}) {
  const [name, setName] = useState(user.name);
  const action = useAsyncAction();

  return (
    <section
      className="cloud-panel profile-panel"
      aria-labelledby="profile-title"
    >
      <h2 id="profile-title">Thông tin cá nhân</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(async (signal) => {
            const result = await apiRequest<{ user: AuthUser }>(
              '/api/auth/profile',
              {
                method: 'PATCH',
                body: {
                  name,
                  expectedRevision: user.profileRevision ?? 0,
                },
                signal,
              },
            );
            onSaved(result.user);
          });
        }}
      >
        <fieldset className="profile-fields" disabled={action.busy}>
          <div className="profile-photo-row">
            <span className="profile-photo" aria-hidden="true">
              {name.trim().charAt(0).toUpperCase()}
            </span>
            <p className="profile-description">{user.name}</p>
          </div>
          <FormField
            label="Tên hiển thị"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={80}
            autoComplete="name"
          />
          <FormField
            label="Email đăng nhập"
            type="email"
            value={user.email}
            readOnly
            autoComplete="email"
          />
          <p className="profile-hint">
            Email đang được dùng để đăng nhập và khôi phục tài khoản.
          </p>
          {action.error && (
            <StatusMessage tone="error">{action.error.message}</StatusMessage>
          )}
          {action.slow && (
            <StatusMessage>Đang chờ xác nhận lưu hồ sơ…</StatusMessage>
          )}
          <Button type="submit" loading={action.busy} disabled={!name.trim()}>
            Lưu hồ sơ
          </Button>
        </fieldset>
      </form>
    </section>
  );
}

function PasswordForm({ onSaved }: { onSaved: (user: AuthUser) => void }) {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [validation, setValidation] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const action = useAsyncAction();
  return (
    <section
      className="cloud-panel profile-panel"
      aria-labelledby="password-title"
    >
      <h2 id="password-title">Đổi mật khẩu</h2>
      <p className="profile-description">
        Sử dụng ít nhất 12 ký tự để bảo vệ tài khoản.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(false);
          setValidation(null);
          if (password !== confirmation) {
            setValidation('Mật khẩu xác nhận chưa khớp.');
            return;
          }
          void action.run(async (signal) => {
            const result = await apiRequest<{ user: AuthUser }>(
              '/api/auth/change-password',
              {
                method: 'POST',
                body: { currentPassword: current, newPassword: password },
                signal,
              },
            );
            setCurrent('');
            setPassword('');
            setConfirmation('');
            setSaved(true);
            onSaved(result.user);
          });
        }}
      >
        <fieldset className="profile-fields" disabled={action.busy}>
          <FormField
            label="Mật khẩu hiện tại"
            type="password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            required
            maxLength={128}
            autoComplete="current-password"
          />
          <FormField
            label="Mật khẩu mới"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
          />
          <FormField
            label="Xác nhận mật khẩu mới"
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
          />
          {(validation || action.error) && (
            <StatusMessage tone="error">
              {validation ?? action.error?.message}
            </StatusMessage>
          )}
          {saved && (
            <StatusMessage>
              Đã đổi mật khẩu. Các phiên đăng nhập khác và kết nối extension đã
              được thu hồi.
            </StatusMessage>
          )}
          {action.slow && (
            <StatusMessage>Đang chờ xác nhận đổi mật khẩu…</StatusMessage>
          )}
          <Button type="submit" loading={action.busy}>
            Đổi mật khẩu
          </Button>
        </fieldset>
      </form>
    </section>
  );
}
