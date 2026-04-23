import { Camera, Circle, Eye, Square, X } from "lucide-react";

type DetectedObject = {
  class: string;
  score: number;
};

export function CameraPreviewSection({
  cameraActive,
  isRecording,
  recordingDuration,
  predictions,
  videoRef,
  canvasRef,
  onToggleCamera,
  onStartRecording,
  onStopRecording,
  onCapturePhoto,
  formatRecordingTime,
}: {
  cameraActive: boolean;
  isRecording: boolean;
  recordingDuration: number;
  predictions: DetectedObject[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onToggleCamera: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCapturePhoto: () => void;
  formatRecordingTime: (seconds: number) => string;
}) {
  return (
    <>
      {cameraActive && (
        <div className="fixed top-16 right-4 z-40 w-[85%] max-w-xl rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/20">
          <div className="relative aspect-[4/3] bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => videoRef.current?.play()}
              className="absolute inset-0 w-full h-full object-cover"
              data-testid="video-live-camera"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

            <div className="absolute top-2 left-2 flex gap-2">
              <div className="flex items-center gap-1 px-2 py-1 bg-red-500/90 backdrop-blur rounded-full">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                <span className="text-[10px] font-medium text-white">LIVE</span>
              </div>
              {isRecording && (
                <div className="flex items-center gap-1 px-2 py-1 bg-red-600/90 backdrop-blur rounded-full animate-pulse">
                  <Circle className="w-1.5 h-1.5 fill-white text-white" />
                  <span className="text-[10px] font-medium text-white">
                    {formatRecordingTime(recordingDuration)}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={onToggleCamera}
              className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              data-testid="button-close-camera"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>

            {predictions.length > 0 && (
              <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                {predictions.slice(0, 4).map((p, i) => (
                  <div
                    key={i}
                    className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-medium text-white"
                  >
                    {p.class} · {Math.round(p.score * 100)}%
                  </div>
                ))}
                {predictions.length > 4 && (
                  <div className="px-2 py-0.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] text-white/70">
                    +{predictions.length - 4} more
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-zinc-900/95 backdrop-blur px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-green-400" />
              <span className="text-xs text-white/70">Vision Active</span>
            </div>
            <div className="flex items-center gap-1">
              {!isRecording ? (
                <button
                  onClick={onStartRecording}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                  title="Start Recording"
                  data-testid="button-start-recording"
                >
                  <Circle className="w-4 h-4 text-red-400" />
                </button>
              ) : (
                <button
                  onClick={onStopRecording}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                  title="Stop Recording"
                  data-testid="button-stop-recording"
                >
                  <Square className="w-4 h-4 text-red-400" />
                </button>
              )}
              <button
                onClick={onCapturePhoto}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                title="Take Photo"
                data-testid="button-take-photo"
              >
                <Camera className="w-4 h-4 text-white/70" />
              </button>
            </div>
          </div>
        </div>
      )}
      {!cameraActive && <canvas ref={canvasRef} className="hidden" />}
    </>
  );
}

