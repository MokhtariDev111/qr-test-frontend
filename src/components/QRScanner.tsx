import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import qrScannerWorkerPath from 'qr-scanner/qr-scanner-worker.min.js?url';
import { Button } from './ui/button';

QrScanner.WORKER_PATH = qrScannerWorkerPath;

interface Props {
  onScan: (data: string) => void;
}

export default function QRScanner({ onScan }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const scanner = useRef<QrScanner | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (video.current) {
      scanner.current = new QrScanner(
        video.current,
        r => {
          onScan(r.data);
          scanner.current?.stop();
          setOn(false);
        },
        {
          highlightScanRegion: true,
          returnDetailedScanResult: true,
          preferredCamera: 'environment', // Use rear camera on mobile
        }
      );
    }
    return () => scanner.current?.destroy();
  }, [onScan]);

  const toggleCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Camera access requires a secure HTTPS connection. Please use the HTTPS link.');
      return;
    }
    if (on) {
      scanner.current?.stop();
      setOn(false);
    } else {
      try {
        await scanner.current?.start();
        setOn(true);
      } catch (err) {
        alert('Camera access denied: ' + String(err));
        setOn(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="bg-black rounded-3xl overflow-hidden w-full max-w-[320px] aspect-square relative flex items-center justify-center shadow-inner">
        <video
          ref={video}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ display: on ? 'block' : 'none' }}
        />
        {!on && (
          <div className="p-10 text-muted-foreground text-center space-y-2">
            <div className="text-4xl">📷</div>
            <p className="italic text-sm opacity-50">Camera Standby</p>
          </div>
        )}
        {on && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-primary rounded-2xl opacity-60" />
          </div>
        )}
      </div>

      <Button
        variant={on ? 'destructive' : 'default'}
        onClick={toggleCamera}
        className="mt-6 h-12 px-10 rounded-2xl shadow-lg transition-transform active:scale-95"
      >
        {on ? 'Cancel' : 'Open Camera'}
      </Button>
    </div>
  );
}
