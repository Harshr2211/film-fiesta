import React from 'react';
import { useAuth } from '../context/AuthContext';

const typeStyles = {
  success: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-50',
  info: 'border-amber-300/30 bg-amber-400/15 text-amber-50',
  warning: 'border-amber-400/30 bg-amber-500/15 text-amber-50',
  error: 'border-red-400/30 bg-red-500/15 text-red-50',
};

export default function ToastStack() {
  const auth = useAuth();
  const notifications = auth?.notifications || [];
  const [closingIds, setClosingIds] = React.useState([]);

  React.useEffect(() => {
    if (!notifications.length) return undefined;

    const now = Date.now();
    const timers = notifications.slice(0, 4).flatMap((notification) => {
      const expiresAt = notification?.expiresAt ? new Date(notification.expiresAt).getTime() : now + 5000;
      const closeDelay = Math.max(expiresAt - now - 350, 0);
      const removeDelay = Math.max(expiresAt - now, 0);

      return [
        window.setTimeout(() => {
          setClosingIds((prev) => (prev.includes(notification.id) ? prev : [...prev, notification.id]));
        }, closeDelay),
        window.setTimeout(() => {
          setClosingIds((prev) => prev.filter((id) => id !== notification.id));
          auth?.dismissNotification?.(notification.id);
        }, removeDelay),
      ];
    });

    return () => timers.forEach((timerId) => window.clearTimeout(timerId));
  }, [auth?.dismissNotification, notifications]);

  React.useEffect(() => {
    setClosingIds((prev) => prev.filter((id) => notifications.some((notification) => notification.id === id)));
  }, [notifications]);

  if (!notifications.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-24 z-[9998] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
      {notifications.slice(0, 4).map((notification) => (
        <div
          key={notification.id}
          className={`toast-item pointer-events-auto overflow-hidden rounded-2xl border px-4 py-4 shadow-2xl shadow-black/25 backdrop-blur-xl ${closingIds.includes(notification.id) ? 'toast-item-closing' : 'toast-item-open'} ${typeStyles[notification.type] || typeStyles.info}`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-current opacity-85" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{notification.title || 'FilmFiesta update'}</p>
              {notification.message ? (
                <p className="mt-1 text-sm leading-6 text-white/80">{notification.message}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => auth?.dismissNotification?.(notification.id)}
              className="rounded-full border border-white/10 px-2 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
