import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, CameraOff, Video, VideoOff, Maximize2, Minimize2, RotateCcw, Download, Square, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LiveCameraFeedProps {
  onCapture?: (imageData: string) => void;
  onVideoStart?: () => void;
  onVideoStop?: (videoBlob: Blob) => void;
  className?: string;
  showControls?: boolean;
  autoStart?: boolean;
}

export function LiveCameraFeed({ 
  onCapture, 
  onVideoStart,
  onVideoStop,
  className,
  showControls = true,
  autoStart = false
}: LiveCameraFeedProps) {
  const [isActive, setIsActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [error, setError] = useState<string | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const checkCameraCapabilities = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === "videoinput");
      setHasMultipleCameras(videoDevices.length > 1);
    } catch (e) {
      console.error("Error checking cameras:", e);
    }
  }, []);

  useEffect(() => {
    checkCameraCapabilities();
    if (autoStart) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsActive(true);
    } catch (err) {
      console.error("Camera error:", err);
      setError(err instanceof Error ? err.message : "Failed to access camera");
      setIsActive(false);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, [isRecording]);

  const toggleCamera = useCallback(() => {
    if (isActive) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [isActive, startCamera, stopCamera]);

  const switchCamera = useCallback(async () => {
    if (!hasMultipleCameras) return;
    
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacingMode);
    
    if (isActive) {
      stopCamera();
      setTimeout(() => {
        startCamera();
      }, 100);
    }
  }, [facingMode, hasMultipleCameras, isActive, startCamera, stopCamera]);

  const captureImage = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    onCapture?.(imageData);
    return imageData;
  }, [onCapture]);

  const startRecording = useCallback(() => {
    if (!streamRef.current || isRecording) return;

    recordedChunksRef.current = [];
    
    const options = { mimeType: "video/webm;codecs=vp9" };
    let mediaRecorder: MediaRecorder;
    
    try {
      mediaRecorder = new MediaRecorder(streamRef.current, options);
    } catch (e) {
      try {
        mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
      } catch (e2) {
        mediaRecorder = new MediaRecorder(streamRef.current);
      }
    }

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      onVideoStop?.(blob);
    };

    mediaRecorder.start(1000);
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
    setRecordingDuration(0);
    onVideoStart?.();

    recordingIntervalRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  }, [isRecording, onVideoStart, onVideoStop]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setRecordingDuration(0);
    }
  }, [isRecording]);

  const downloadRecording = useCallback(() => {
    if (recordedChunksRef.current.length === 0) return;
    
    const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cyrus-recording-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className={cn("bg-slate-900/80 border-slate-700 overflow-hidden", className)} ref={containerRef}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-cyan-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Live Camera Feed
            {isActive && (
              <span className="flex items-center gap-1 text-green-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                LIVE
              </span>
            )}
            {isRecording && (
              <span className="flex items-center gap-1 text-red-400 text-xs ml-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                REC {formatDuration(recordingDuration)}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {hasMultipleCameras && isActive && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={switchCamera}
                data-testid="button-switch-camera"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={toggleFullscreen}
              data-testid="button-fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-video bg-black">
          {isActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              data-testid="video-live-feed"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
              <CameraOff className="w-12 h-12 mb-2" />
              <p className="text-sm">Camera offline</p>
              {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {isActive && showControls && (
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20"
                  onClick={captureImage}
                  data-testid="button-capture"
                >
                  <Camera className="w-5 h-5 text-white" />
                </Button>

                {!isRecording ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 rounded-full bg-red-500/80 hover:bg-red-500"
                    onClick={startRecording}
                    data-testid="button-start-recording"
                  >
                    <Circle className="w-6 h-6 text-white fill-white" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600 animate-pulse"
                    onClick={stopRecording}
                    data-testid="button-stop-recording"
                  >
                    <Square className="w-5 h-5 text-white fill-white" />
                  </Button>
                )}

                {recordedChunksRef.current.length > 0 && !isRecording && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20"
                    onClick={downloadRecording}
                    data-testid="button-download-recording"
                  >
                    <Download className="w-5 h-5 text-white" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {showControls && (
          <div className="p-3 border-t border-slate-700">
            <Button
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={toggleCamera}
              className={cn(
                "w-full",
                isActive 
                  ? "bg-green-500 hover:bg-green-600 text-white" 
                  : "border-cyan-500/50 text-cyan-400"
              )}
              data-testid="button-toggle-camera"
            >
              {isActive ? (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Camera Active
                </>
              ) : (
                <>
                  <CameraOff className="w-4 h-4 mr-2" />
                  Start Camera
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MiniCameraPreview({ 
  active, 
  onToggle,
  videoRef
}: { 
  active: boolean; 
  onToggle: () => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
}) {
  return (
    <div className="relative">
      {active ? (
        <div className="relative w-full h-32 bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 px-2 py-1 rounded text-xs text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </div>
        </div>
      ) : (
        <div className="w-full h-32 bg-slate-800 rounded-lg flex items-center justify-center">
          <div className="text-center text-slate-500">
            <CameraOff className="w-8 h-8 mx-auto mb-1" />
            <p className="text-xs">Camera Off</p>
          </div>
        </div>
      )}
      <Button
        variant={active ? "default" : "outline"}
        size="sm"
        onClick={onToggle}
        className={cn(
          "absolute bottom-2 left-1/2 -translate-x-1/2",
          active 
            ? "bg-green-500/80 hover:bg-green-600 text-white" 
            : "border-cyan-500/50 text-cyan-400 bg-slate-900/80"
        )}
        data-testid="button-mini-camera-toggle"
      >
        {active ? <Camera className="w-3 h-3" /> : <CameraOff className="w-3 h-3" />}
      </Button>
    </div>
  );
}
