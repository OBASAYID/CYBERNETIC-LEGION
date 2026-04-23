import { useEffect, useRef } from "react";
import { MonitorOff, Maximize2 } from "lucide-react";

interface ScreenShareViewProps {
  stream: MediaStream;
  sharerName: string;
  isLocal: boolean;
  onStopSharing?: () => void;
}

export function ScreenShareView({
  stream,
  sharerName,
  isLocal,
  onStopSharing,
}: ScreenShareViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative flex-1 bg-black rounded-2xl overflow-hidden border border-gray-800/50">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />

      <div className="absolute top-3 left-3 flex items-center gap-2 bg-gray-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-700/40">
        <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-xs font-medium text-white">
          {isLocal ? "You are sharing your screen" : `${sharerName} is sharing`}
        </span>
      </div>

      {isLocal && onStopSharing && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <button
            onClick={onStopSharing}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg shadow-xl shadow-red-600/30 transition-all active:scale-95"
          >
            <MonitorOff className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">Stop Sharing</span>
          </button>
        </div>
      )}
    </div>
  );
}
