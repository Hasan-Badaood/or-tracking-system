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
  // Captured independently so we always have a reference regardless of what
  // zxing does with videoRef.srcObject internally.
  const streamRef = useRef<MediaStream | null>(null);

  const [error,    setError]    = useState('');
  const [starting, setStarting] = useState(true);

  /** Hard-stop: kills the decode loop AND releases the camera hardware. */
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
        const devices = await reader.listVideoInputDevices();
        if (devices.length === 0) {
          setError('No camera found on this device.');
          setStarting(false);
          return;
        }

        await reader.decodeFromVideoDevice(
          devices[0].deviceId,
          videoRef.current!,
          (result, err) => {
            // Grab the stream reference as soon as the video is live
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

        // Also capture immediately after decodeFromVideoDevice resolves
        if (videoRef.current?.srcObject instanceof MediaStream) {
          streamRef.current = videoRef.current.srcObject;
        }

        setStarting(false);
      } catch (err: any) {
        if (err?.name === 'NotAllowedError') {
          setError('Camera access was denied. Please allow camera permission and try again.');
        } else {
          setError('Could not start camera: ' + (err?.message ?? 'unknown error'));
        }
        setStarting(false);
      }
    };

    start();

    // Cleanup on unmount — guaranteed to fire even if handleClose already ran
    return () => { stopCamera(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-50 border border-slate-200 p-8 text-center h-44 sm:h-52">
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
    <div className="relative rounded-xl overflow-hidden bg-black h-44 sm:h-52">
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

      {/* Scan guide */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="relative w-52 h-16">
          <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-400 rounded-tl" />
          <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-400 rounded-tr" />
          <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-400 rounded-bl" />
          <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-400 rounded-br" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-blue-400/60" />
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
        <p className="text-white/70 text-xs text-center">Point at a CODE128 barcode</p>
      </div>
    </div>
  );
};
