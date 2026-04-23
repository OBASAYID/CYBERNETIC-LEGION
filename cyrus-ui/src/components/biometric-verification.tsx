import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, UserCheck, UserPlus, Shield, ShieldCheck, ShieldX, RefreshCw, Scan, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { systemFetch } from "@/lib/system-api";
import { getSessionToken, markBiometricVerified } from "@/lib/auth-storage";

interface VerificationResult {
  verified: boolean;
  operator?: {
    id: string;
    name: string;
    role: string;
    clearanceLevel: string;
  };
  confidence?: number;
  sessionToken?: string;
  message: string;
}

interface BiometricVerificationProps {
  onVerified?: (result: VerificationResult) => void;
  onSessionToken?: (token: string) => void;
  mode?: "verify" | "register" | "both";
  className?: string;
}

export function BiometricVerification({ 
  onVerified, 
  onSessionToken,
  mode = "both",
  className 
}: BiometricVerificationProps) {
  const [isActive, setIsActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentMode, setCurrentMode] = useState<"verify" | "register">(mode === "both" ? "verify" : mode);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Registration form state
  const [operatorName, setOperatorName] = useState("");
  const [operatorRole, setOperatorRole] = useState("Operator");
  const [clearanceLevel, setClearanceLevel] = useState("STANDARD");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
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
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.9);
  }, []);

  const getAuthHeaders = (): HeadersInit => {
    const sessionToken = getSessionToken();
    if (sessionToken) {
      return { 
        "Content-Type": "application/json",
        "X-Cyrus-Session-Token": sessionToken 
      };
    }
    return { "Content-Type": "application/json" };
  };

  const startVerification = useCallback(async () => {
    if (!isActive) {
      await startCamera();
      return;
    }

    setIsScanning(true);
    setError(null);
    setResult(null);
    setCountdown(3);

    // Countdown before capture
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setCountdown(null);

    const faceImage = captureFrame();
    if (!faceImage) {
      setError("Failed to capture image");
      setIsScanning(false);
      return;
    }

    try {
      const response = await systemFetch("/api/biometric/verify", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ faceImageBase64: faceImage })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Verification failed");
        setResult({ verified: false, message: data.message || data.error });
      } else {
        setResult(data);
        if (data.sessionToken) {
          onSessionToken?.(data.sessionToken);
        }
        if (data.verified && data.biometricVerified) {
          // Mark 2FA as complete for this browser session.
          markBiometricVerified();
        }
        onVerified?.(data);
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError("Network error during verification");
    } finally {
      setIsScanning(false);
    }
  }, [isActive, startCamera, captureFrame, onVerified, onSessionToken]);

  const startRegistration = useCallback(async () => {
    if (!isActive) {
      await startCamera();
      return;
    }

    if (!operatorName.trim()) {
      setError("Operator name is required");
      return;
    }

    setIsRegistering(true);
    setError(null);
    setResult(null);
    setCountdown(3);

    // Countdown before capture
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setCountdown(null);

    const faceImage = captureFrame();
    if (!faceImage) {
      setError("Failed to capture image");
      setIsRegistering(false);
      return;
    }

    try {
      const response = await systemFetch("/api/biometric/register", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          name: operatorName.trim(),
          role: operatorRole,
          clearanceLevel: clearanceLevel,
          faceImageBase64: faceImage 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        if (data.details) {
          setError(`${data.error}: ${data.details.join(", ")}`);
        }
      } else {
        setResult({
          verified: true,
          operator: {
            id: data.operatorId,
            name: data.name,
            role: data.role,
            clearanceLevel: data.clearanceLevel
          },
          message: data.message
        });
        // Reset form
        setOperatorName("");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("Network error during registration");
    } finally {
      setIsRegistering(false);
    }
  }, [isActive, startCamera, captureFrame, operatorName, operatorRole, clearanceLevel]);

  const resetState = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return (
    <Card className={cn("overflow-hidden", className)} data-testid="biometric-verification-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Biometric Identification System
        </CardTitle>
        
        {mode === "both" && (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant={currentMode === "verify" ? "default" : "outline"}
              onClick={() => { setCurrentMode("verify"); resetState(); }}
              data-testid="button-mode-verify"
            >
              <UserCheck className="h-4 w-4 mr-1" />
              Verify
            </Button>
            <Button
              size="sm"
              variant={currentMode === "register" ? "default" : "outline"}
              onClick={() => { setCurrentMode("register"); resetState(); }}
              data-testid="button-mode-register"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Register
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Camera View */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "w-full h-full object-cover",
              !isActive && "hidden"
            )}
          />
          <canvas ref={canvasRef} className="hidden" />

          {!isActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Camera className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">Camera inactive</p>
            </div>
          )}

          {/* Scanning overlay */}
          {(isScanning || isRegistering) && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="text-center text-white">
                {countdown !== null ? (
                  <div className="text-6xl font-bold animate-pulse">{countdown}</div>
                ) : (
                  <>
                    <Scan className="h-16 w-16 mx-auto mb-2 animate-pulse text-primary" />
                    <p className="text-lg font-medium">
                      {isScanning ? "Verifying identity..." : "Capturing face..."}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Face guide overlay */}
          {isActive && !isScanning && !isRegistering && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-60 border-2 border-primary/50 rounded-full" />
              <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm bg-black/50 py-1">
                Position your face within the oval
              </p>
            </div>
          )}
        </div>

        {/* Registration Form */}
        {currentMode === "register" && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="operator-name">Operator Name</Label>
              <Input
                id="operator-name"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="Enter full name"
                data-testid="input-operator-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={operatorRole} onValueChange={setOperatorRole}>
                  <SelectTrigger id="role" data-testid="select-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Operator">Operator</SelectItem>
                    <SelectItem value="Pilot">Pilot</SelectItem>
                    <SelectItem value="Commander">Commander</SelectItem>
                    <SelectItem value="Administrator">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="clearance">Clearance Level</Label>
                <Select value={clearanceLevel} onValueChange={setClearanceLevel}>
                  <SelectTrigger id="clearance" data-testid="select-clearance">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                    <SelectItem value="ELEVATED">Elevated</SelectItem>
                    <SelectItem value="SECRET">Secret</SelectItem>
                    <SelectItem value="TOP_SECRET">Top Secret</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm" data-testid="text-error">
            <ShieldX className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
            <Button size="icon" variant="ghost" className="ml-auto h-6 w-6" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Result display */}
        {result && (
          <div 
            className={cn(
              "p-3 rounded-lg border text-sm",
              result.verified 
                ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400" 
                : "bg-destructive/10 border-destructive/20 text-destructive"
            )}
            data-testid="text-result"
          >
            <div className="flex items-center gap-2">
              {result.verified ? (
                <ShieldCheck className="h-5 w-5 flex-shrink-0" />
              ) : (
                <ShieldX className="h-5 w-5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-medium">{result.message}</p>
                {result.operator && (
                  <p className="text-xs opacity-80 mt-1">
                    {result.operator.role} | Clearance: {result.operator.clearanceLevel}
                    {result.confidence && ` | Confidence: ${result.confidence}%`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {!isActive ? (
            <Button 
              className="flex-1" 
              onClick={startCamera}
              data-testid="button-start-camera"
            >
              <Camera className="h-4 w-4 mr-2" />
              Start Camera
            </Button>
          ) : (
            <>
              <Button
                className="flex-1"
                onClick={currentMode === "verify" ? startVerification : startRegistration}
                disabled={isScanning || isRegistering}
                data-testid="button-scan"
              >
                {isScanning || isRegistering ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : currentMode === "verify" ? (
                  <Scan className="h-4 w-4 mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                {currentMode === "verify" ? "Verify Identity" : "Register Face"}
              </Button>
              <Button
                variant="outline"
                onClick={stopCamera}
                disabled={isScanning || isRegistering}
                data-testid="button-stop-camera"
              >
                Stop
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}