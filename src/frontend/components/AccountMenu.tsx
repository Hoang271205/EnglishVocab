import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { AuthUser } from '../features/auth/auth.types';
import Icon from './ui/Icon';

export default function AccountMenu({
  user,
  busy,
  disabled,
  onSettings,
  onLogout,
}: {
  user: AuthUser;
  busy: boolean;
  disabled: boolean;
  onSettings: () => void;
  onLogout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const focusIndex = useRef(0);
  useEffect(() => {
    if (!open) return;
    const items = panel.current?.querySelectorAll<HTMLButtonElement>(
      'button:not(:disabled)',
    );
    items?.[focusIndex.current === -1 ? items.length - 1 : 0]?.focus();
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !container.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  function keydown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
    if (!open || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key))
      return;
    event.preventDefault();
    const items = Array.from(
      panel.current?.querySelectorAll<HTMLButtonElement>(
        'button:not(:disabled)',
      ) ?? [],
    );
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const index =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) %
            items.length;
    items[index]?.focus();
  }
  return (
    <div
      className="account-menu"
      ref={container}
      onKeyDown={keydown}
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="account-menu-trigger"
        aria-label={`Menu tài khoản của ${user.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        disabled={busy}
        onClick={() => {
          focusIndex.current = 0;
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            focusIndex.current = event.key === 'ArrowUp' ? -1 : 0;
            setOpen(true);
          }
        }}
      >
        <span className="account-avatar" aria-hidden="true">
          {user.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="account-display-name" title={user.name}>
          {user.name}
        </span>
        <Icon
          name={busy ? 'spinner' : 'chevron-down'}
          className={busy ? 'ui-spinner' : ''}
        />
      </button>
      {open && (
        <div
          ref={panel}
          id={id}
          className="account-menu-panel"
          role="menu"
          aria-label="Tài khoản cá nhân"
        >
          <button
            type="button"
            role="menuitem"
            disabled={disabled || busy}
            onClick={() => {
              close();
              onSettings();
            }}
          >
            <Icon name="settings" /> Cài đặt cá nhân
          </button>
          <button
            type="button"
            role="menuitem"
            className="account-menu-logout"
            disabled={disabled || busy}
            onClick={() => {
              close();
              void onLogout();
            }}
          >
            <Icon name="logout" /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
