export type CommsSessionRecording = {
  id: string;
  callId: string;
  type: string;
  participants: unknown;
  callType: "audio" | "video";
  quality: string | null;
  startTime: string | null;
  endTime: string | null;
  durationSeconds: number | null;
  recordingUrl: string;
  recordedBy?: string | null;
  fileSizeBytes?: number | null;
};

export type CommsRecordingUploadResult = {
  success: boolean;
  recordingUrl: string;
  fileSize: number;
  mimeType: string;
  durationSeconds?: number;
};
