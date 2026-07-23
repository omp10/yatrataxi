import { useEffect, useRef, useState } from 'react';

// Camera QR scanning on the native BarcodeDetector — no library, but it is
// Chromium-only, so every caller must keep a manual-entry fallback for the
// browsers that report unsupported.
export const useQrScanner = ({ onDetect, paused = false }) => {
  const videoRef = useRef(null);
  const scanLoopRef = useRef(null);
  const streamRef = useRef(null);
  const pausedRef = useRef(paused);
  const onDetectRef = useRef(onDetect);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  pausedRef.current = paused;
  onDetectRef.current = onDetect;

  const stopCamera = () => {
    if (scanLoopRef.current) {
      window.clearInterval(scanLoopRef.current);
      scanLoopRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    setCameraError('');

    if (!('BarcodeDetector' in window)) {
      setCameraError('Camera QR scanning is not supported in this browser. Enter the code manually below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      setCameraActive(true);

      scanLoopRef.current = window.setInterval(async () => {
        if (!videoRef.current || pausedRef.current) return;

        try {
          const codes = await detector.detect(videoRef.current);
          const value = codes?.[0]?.rawValue;
          if (value) {
            await onDetectRef.current?.(value);
          }
        } catch {
          setCameraError('Unable to read the QR. Try better light or enter the code manually.');
        }
      }, 700);
    } catch {
      setCameraError('Camera permission was blocked. Enter the code manually to continue.');
      stopCamera();
    }
  };

  return { videoRef, cameraActive, cameraError, setCameraError, startCamera, stopCamera };
};

export default useQrScanner;
