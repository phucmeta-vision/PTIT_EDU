// D10 – đồng hồ theo deadline của server, F5 không reset
import { useEffect, useRef, useState } from 'react';

const pad = (n) => String(n).padStart(2, '0');
export const formatMs = (ms) => {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  return `${h ? `${pad(h)}:` : ''}${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

export default function useServerCountdown({ expiresAt, serverNow, onExpire }) {
  const [remainingMs, setRemainingMs] = useState(null);
  const onExpireRef = useRef(onExpire);
  const firedRef = useRef(false);

  useEffect(() => { onExpireRef.current = onExpire; });

  useEffect(() => {
    if (!expiresAt || !serverNow) return undefined;
    // Độ lệch giữa đồng hồ client và server, tính 1 lần khi nhận dữ liệu
    const offset = new Date(serverNow).getTime() - Date.now();
    const deadline = new Date(expiresAt).getTime();
    firedRef.current = false;

    const tick = () => {
      const left = Math.max(0, deadline - (Date.now() + offset));
      setRemainingMs(left);
      if (left === 0 && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current && onExpireRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id); // cleanup khi unmount
  }, [expiresAt, serverNow]);

  return {
    remainingMs,
    formatted: remainingMs == null ? '--:--' : formatMs(remainingMs),
    isLow: remainingMs != null && remainingMs <= 60 * 1000,
  };
}
