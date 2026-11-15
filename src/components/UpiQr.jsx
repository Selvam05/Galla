import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { upiLink } from '../lib/utils';

export default function UpiQr({ upiId, name, amount, note, size = 220 }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(upiLink({ upiId, name, amount, note }), {
      margin: 1,
      width: size * 2,
      color: { dark: '#0c0907', light: '#ffffff' },
    }).then((url) => alive && setSrc(url));
    return () => {
      alive = false;
    };
  }, [upiId, name, amount, note, size]);

  return (
    <div className="rounded-2xl p-3 shadow-[0_20px_50px_-20px_rgba(234,181,87,.5)]" style={{ width: size + 24, background: "#fff" }}>
      {src ? (
        <img src={src} alt="UPI QR" width={size} height={size} className="block" />
      ) : (
        <div style={{ width: size, height: size }} className="animate-pulse bg-neutral-100 rounded-lg" />
      )}
    </div>
  );
}
