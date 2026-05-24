/**
 * React hook for in-call / group session recording.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  CommsSessionRecorder,
  type SessionRecorderState,
} from "../lib/comms-session-recorder";
import type { CommsRecordingUploadResult } from "@shared/comms/recording-types";

export type UseCommsSessionRecordingOptions = {
  roomId: string | null;
  callType: "audio" | "video";
  localStream: MediaStream | null;
  remoteStreams: MediaStream[];
  screenShareStream?: MediaStream | null;
  recordedBy?: string;
  displayName?: string;
  socketRef?: React.MutableRefObject<Socket | null>;
  /** Stop and upload when the call session ends */
  autoStopOnUnmount?: boolean;
};

export function useCommsSessionRecording({
  roomId,
  callType,
  localStream,
  remoteStreams,
  screenShareStream,
  recordedBy,
  displayName,
  socketRef,
  autoStopOnUnmount = true,
}: UseCommsSessionRecordingOptions) {
  const recorderRef = useRef<CommsSessionRecorder | null>(null);
  const [state, setState] = useState<SessionRecorderState>("idle");
  const [durationSec, setDurationSec] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<CommsRecordingUploadResult | null>(null);

  const ensureRecorder = useCallback(() => {
    if (!recorderRef.current) {
      recorderRef.current = new CommsSessionRecorder((next, detail) => {
        setState(next);
        if (detail?.durationSec !== undefined) setDurationSec(detail.durationSec);
        if (detail?.error) setLastError(detail.error);
        if (next === "idle") setLastError(null);
      });
    }
    return recorderRef.current;
  }, []);

  const broadcastRecordingState = useCallback(
    (isRecording: boolean) => {
      if (!roomId || !socketRef?.current) return;
      socketRef.current.emit("session-recording-state", {
        roomId,
        isRecording,
        userId: recordedBy,
        displayName,
      });
    },
    [roomId, recordedBy, displayName, socketRef],
  );

  const startRecording = useCallback(() => {
    if (!roomId) return false;
    setLastError(null);
    setLastUpload(null);
    const ok = ensureRecorder().start({
      roomId,
      callType,
      localStream,
      remoteStreams,
      screenShareStream,
      recordedBy,
      displayName,
    });
    if (ok) broadcastRecordingState(true);
    return ok;
  }, [
    roomId,
    callType,
    localStream,
    remoteStreams,
    screenShareStream,
    recordedBy,
    displayName,
    ensureRecorder,
    broadcastRecordingState,
  ]);

  const stopRecording = useCallback(async () => {
    broadcastRecordingState(false);
    const result = await ensureRecorder().stop(true, true);
    if (result) setLastUpload(result);
    return result;
  }, [ensureRecorder, broadcastRecordingState]);

  const toggleRecording = useCallback(async () => {
    const rec = ensureRecorder();
    if (rec.isRecording()) {
      return stopRecording();
    }
    return startRecording() ? null : null;
  }, [ensureRecorder, startRecording, stopRecording]);

  // Auto-stop when room changes or unmounts
  useEffect(() => {
    return () => {
      if (!autoStopOnUnmount) return;
      const rec = recorderRef.current;
      if (rec?.isRecording()) {
        void rec.stop(true, true);
        broadcastRecordingState(false);
      }
    };
  }, [autoStopOnUnmount, broadcastRecordingState]);

  useEffect(() => {
    if (!roomId && recorderRef.current?.isRecording()) {
      void recorderRef.current.stop(true, true);
      broadcastRecordingState(false);
    }
  }, [roomId, broadcastRecordingState]);

  return {
    isRecording: state === "recording",
    isUploading: state === "uploading",
    recordingState: state,
    recordingDurationSec: durationSec,
    lastRecordingError: lastError,
    lastRecordingUpload: lastUpload,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
