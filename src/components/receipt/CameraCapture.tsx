import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Camera, Zap, ZapOff, RotateCcw } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

// Guide rectangle as fractions of the viewport — receipts are tall, so the
// guide is also tall.
const GUIDE = { x: 0.06, y: 0.16, w: 0.88, h: 0.66 } as const;

interface TorchTrack extends MediaStreamTrack {
  applyConstraints(
    constraints: MediaTrackConstraints & {
      advanced?: ({ torch?: boolean } & MediaTrackConstraints)[];
    }
  ): Promise<void>;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startStream = useCallback(async () => {
    setError(null);
    setIsReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0] as TorchTrack | undefined;
      // Detect torch support via getCapabilities (Chromium-only mostly).
      const caps = track?.getCapabilities?.() as
        | (MediaTrackCapabilities & { torch?: boolean })
        | undefined;
      setTorchSupported(!!caps?.torch);

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
        setIsReady(true);
      }
    } catch (e) {
      if (e instanceof Error) {
        if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
          setError(
            "Camera access was blocked. Allow camera permission in your browser settings, then tap Try again."
          );
        } else if (e.name === 'NotFoundError' || e.name === 'OverconstrainedError') {
          setError("No camera found on this device. Use the file upload option instead.");
        } else {
          setError(e.message || 'Could not start the camera.');
        }
      } else {
        setError('Could not start the camera.');
      }
    }
  }, []);

  useEffect(() => {
    startStream();
    return () => stopStream();
  }, [startStream, stopStream]);

  const handleToggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0] as TorchTrack | undefined;
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn((v) => !v);
    } catch (e) {
      console.warn('Torch toggle failed', e);
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !isReady) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;

    // The video is rendered with object-cover. Compute how it maps to the
    // viewport so we can translate the on-screen guide rectangle back to
    // pixel coordinates in the source video frame.
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const scale = Math.max(screenW / vw, screenH / vh);
    const displayedW = vw * scale;
    const displayedH = vh * scale;
    const offsetX = (screenW - displayedW) / 2;
    const offsetY = (screenH - displayedH) / 2;

    const guideXScreen = screenW * GUIDE.x;
    const guideYScreen = screenH * GUIDE.y;
    const guideWScreen = screenW * GUIDE.w;
    const guideHScreen = screenH * GUIDE.h;

    let srcX = Math.max(0, (guideXScreen - offsetX) / scale);
    let srcY = Math.max(0, (guideYScreen - offsetY) / scale);
    let srcW = Math.min(vw - srcX, guideWScreen / scale);
    let srcH = Math.min(vh - srcY, guideHScreen / scale);

    // Safety clamp.
    srcX = Math.max(0, Math.floor(srcX));
    srcY = Math.max(0, Math.floor(srcY));
    srcW = Math.max(1, Math.floor(srcW));
    srcH = Math.max(1, Math.floor(srcH));

    const canvas = document.createElement('canvas');
    canvas.width = srcW;
    canvas.height = srcH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopStream();
        onCapture(blob);
      },
      'image/jpeg',
      0.92
    );
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-lg">
        <div className="bg-white rounded-xl max-w-sm p-xl space-y-md text-center">
          <h2 className="font-medium text-ink-900">Camera unavailable</h2>
          <p className="text-sm text-ink-500">{error}</p>
          <div className="flex gap-sm justify-center pt-sm">
            <button
              onClick={onCancel}
              className="px-md py-sm rounded-md text-ink-700 hover:bg-surface-hover"
            >
              Close
            </button>
            <button
              onClick={startStream}
              className="px-md py-sm rounded-md bg-clay text-white inline-flex items-center gap-xs"
            >
              <RotateCcw className="w-4 h-4" />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />

      {/* Dimming overlay outside the guide rectangle. */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute left-0 right-0 top-0 bg-black/55"
          style={{ height: `${GUIDE.y * 100}%` }}
        />
        <div
          className="absolute left-0 right-0 bottom-0 bg-black/55"
          style={{ height: `${(1 - GUIDE.y - GUIDE.h) * 100}%` }}
        />
        <div
          className="absolute top-0 bottom-0 left-0 bg-black/55"
          style={{
            top: `${GUIDE.y * 100}%`,
            height: `${GUIDE.h * 100}%`,
            width: `${GUIDE.x * 100}%`,
          }}
        />
        <div
          className="absolute top-0 bottom-0 right-0 bg-black/55"
          style={{
            top: `${GUIDE.y * 100}%`,
            height: `${GUIDE.h * 100}%`,
            width: `${(1 - GUIDE.x - GUIDE.w) * 100}%`,
          }}
        />

        {/* Guide rectangle outline + corner markers. */}
        <div
          className="absolute border border-white/80 rounded-lg"
          style={{
            left: `${GUIDE.x * 100}%`,
            top: `${GUIDE.y * 100}%`,
            width: `${GUIDE.w * 100}%`,
            height: `${GUIDE.h * 100}%`,
          }}
        >
          <Corner position="tl" />
          <Corner position="tr" />
          <Corner position="bl" />
          <Corner position="br" />
        </div>
      </div>

      {/* Top bar. */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-md pt-md">
        <button
          onClick={() => {
            stopStream();
            onCancel();
          }}
          aria-label="Close camera"
          className="w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
        <p className="text-white text-xs bg-black/40 px-md py-xs rounded-full">
          Fit the receipt inside the frame
        </p>
        {torchSupported ? (
          <button
            onClick={handleToggleTorch}
            aria-label={torchOn ? 'Turn off flash' : 'Turn on flash'}
            className="w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center"
          >
            {torchOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
          </button>
        ) : (
          <span className="w-10" />
        )}
      </div>

      {/* Capture button. */}
      <div className="absolute bottom-0 inset-x-0 z-10 pb-2xl flex justify-center">
        <button
          onClick={handleCapture}
          disabled={!isReady}
          aria-label="Take photo"
          className="w-20 h-20 rounded-full bg-white/95 border-4 border-white/50 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Camera className="w-7 h-7 text-ink-900" />
        </button>
      </div>
    </div>
  );
};

const Corner: React.FC<{ position: 'tl' | 'tr' | 'bl' | 'br' }> = ({ position }) => {
  const base = 'absolute w-5 h-5 border-clay';
  const pos = {
    tl: '-top-0.5 -left-0.5 border-t-2 border-l-2 rounded-tl-md',
    tr: '-top-0.5 -right-0.5 border-t-2 border-r-2 rounded-tr-md',
    bl: '-bottom-0.5 -left-0.5 border-b-2 border-l-2 rounded-bl-md',
    br: '-bottom-0.5 -right-0.5 border-b-2 border-r-2 rounded-br-md',
  };
  return <div className={`${base} ${pos[position]}`} />;
};
