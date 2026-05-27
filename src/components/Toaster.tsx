'use client';

import { useEffect, useState } from 'react';

type ToastMsg = { id: number; text: string; type: 'default' | 'success' | 'error' };

/** 전역 토스트. 어디서든 toast('메시지', 'success') 로 호출. */
export function toast(text: string, type: ToastMsg['type'] = 'default') {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { text, type } }));
}

export default function Toaster() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    let seq = 0;
    const handler = (e: Event) => {
      const { text, type } = (e as CustomEvent).detail as Omit<ToastMsg, 'id'>;
      const id = ++seq;
      setItems((prev) => [...prev, { id, text, type }]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3500);
    };
    window.addEventListener('app-toast', handler);
    return () => window.removeEventListener('app-toast', handler);
  }, []);

  return (
    <>
      {items.map((t, i) => (
        <div key={t.id} className={`toast ${t.type}`} style={{ bottom: 28 + i * 60 }}>
          {t.text}
        </div>
      ))}
    </>
  );
}
