import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Button } from './ui/button';
import { CameraOff, Loader2 } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const start = async () => {
      try {
        const devices = await reader.listVideoInputDevices();
        if (devices.length === 0) {
          setError('No camera found on this device');
          setStarting(false);
          return;
        }

        const deviceId = devices[0].deviceId;

        await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current!,
          (result, err) => {
            if (result) {
              onScan(result.getText());
            }
            if (err && !(err instanceof NotFoundException)) {
              // NotFoundException fires every frame when no barcode is found — ignore it
              console.warn('Barcode reader error:', err);
            }
          }
        );

        setStarting(false);
      } catch (err: any) {
        if (err?.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access and try again.');
        } else {
          setError('Failed to start camera: ' + (err?.message ?? 'unknown error'));
        }
        setStarting(false);
      }
    };

    start();

    return () => {
      reader.reset();
    };
  }, [onScan]);

  return (
    <div className="space-y-3">
      {error ? (
        <div className="flex flex-col items-center justify-center gap-3 p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <CameraOff className="h-12 w-12 text-gray-400" />
          <p className="text-sm text-red-600 text-center">{error}</p>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden bg-black">
          {starting && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
          <video
            ref={videoRef}
            className="w-full max-h-64 object-cover"
            autoPlay
            playsInline
            muted
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-blue-400 rounded w-48 h-20 opacity-70" />
          </div>
        </div>
      )}
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Point camera at barcode</span>
        <Button variant="ghost" size="sm" onClick={onClose}>Close Camera</Button>
      </div>
    </div>
  );
};
