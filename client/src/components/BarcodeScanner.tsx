import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Loader2, X, CameraOff } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [error,    setError]    = useState('');
  const [starting, setStarting] = useState(true);

  const stopCamera = () => {
    try { readerRef.current?.reset(); } catch { /* ignore */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const start = async () => {
      try {
        // Use environment (rear) camera on mobile; falls back to any camera on desktop
        await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current!,
          (result, err) => {
            if (!streamRef.current && videoRef.current?.srcObject instanceof MediaStream) {
              streamRef.current = videoRef.current.srcObject;
            }
            if (result) {
              stopCamera();
              onScan(result.getText());
            }
            if (err && !(err instanceof NotFoundException)) {
              console.warn('Barcode reader:', err);
            }
          }
        );

        if (videoRef.current?.srcObject instanceof MediaStream) {
          streamRef.current = videoRef.current.srcObject;
        }

        setStarting(false);
      } catch (err: any) {
        if (err?.name === 'NotAllowedError') {
          setError('Camera access was denied. Please allow camera permission and try again.');
        } else if (err?.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError('Could not start camera: ' + (err?.message ?? 'unknown error'));
        }
        setStarting(false);
      }
    };

    start();

    return () => { stopCamera(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-50 border border-slate-200 p-8 text-center h-52 sm:h-64">
        <CameraOff className="h-10 w-10 text-slate-400" />
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={handleClose}
          className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 transition-colors"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden bg-black h-52 sm:h-64">
      {/* Loading overlay */}
      {starting && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/70">
          <Loader2 className="h-7 w-7 animate-spin text-white" />
        </div>
      )}

      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {/* Scan guide — wide rectangle suited for Code128 barcodes */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        {/* Dark overlay top */}
        <div className="absolute inset-x-0 top-0 h-[30%] bg-black/40" />
        {/* Dark overlay bottom */}
        <div className="absolute inset-x-0 bottom-0 h-[30%] bg-black/40" />
        {/* Dark overlay left */}
        <div className="absolute left-0 top-[30%] bottom-[30%] w-[8%] bg-black/40" />
        {/* Dark overlay right */}
        <div className="absolute right-0 top-[30%] bottom-[30%] w-[8%] bg-black/40" />

        {/* Corner marks */}
        <div className="relative" style={{ width: '84%', height: '40%' }}>
          <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-blue-400" />
          <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-blue-400" />
          <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-blue-400" />
          <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-blue-400" />
          {/* Scan line */}
          <div className="absolute inset-x-0 top-1/2 h-px bg-blue-400/70" />
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-2.5 right-2.5 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
        aria-label="Close camera"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Bottom hint */}
      <div className="absolute bottom-0 inset-x-0 z-10 py-2 px-3 bg-gradient-to-t from-black/60 to-transparent">
        <p className="text-white/80 text-xs text-center">Align barcode within the frame</p>
      </div>
    </div>
  );
};
