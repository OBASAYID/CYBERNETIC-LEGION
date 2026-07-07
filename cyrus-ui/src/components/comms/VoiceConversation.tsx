/**
 * Voice Conversation Component
 *
 * Real working voice-to-voice interface for CYRUS.
 * Records audio, sends to /api/voice/conversation endpoint,
 * receives transcription + synthesized response.
 */

import { useRef, useState } from 'react';
import { Mic, Square, Volume2, Loader2, AlertCircle } from 'lucide-react';
import { systemFetch } from '@shared/cyrus-api-client';
import { getAuthenticatedUserId } from '@/lib/auth-storage';

interface VoiceApiErrorResponse {
  message?: string;
}

interface VoiceApiResponse {
  /** Server-side transcription of the user's spoken audio. */
  transcription?: string;
  /** CYRUS text reply. */
  text?: string;
  /** Base64 data URL for the synthesized audio reply. */
  audio?: string;
}

export function VoiceConversation() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cyrusText, setCyrusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Array<{ role: 'user' | 'cyrus'; text: string }>>([]);

  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Initialize audio recording
   */
  const startRecording = async () => {
    try {
      setError(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioToServer(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      setError(`Microphone access denied: ${err instanceof Error ? err.message : String(err)}`);
      console.error('[Voice] Recording start failed:', err);
    }
  };

  /**
   * Stop recording
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  /**
   * Send audio to voice API
   */
  const sendAudioToServer = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      setError(null);

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('context', 'General conversation with CYRUS');

      const userId = getAuthenticatedUserId();

      const response = await systemFetch('/api/voice/conversation', {
        method: 'POST',
        headers: {
          'X-User-Id': userId,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json() as VoiceApiErrorResponse;
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const result = await response.json() as VoiceApiResponse;

      // Add the server's transcription of the user's speech to the transcript
      if (result.transcription?.trim()) {
        const transcription = result.transcription;
        setTranscript((prev) => [...prev, { role: 'user', text: transcription }]);
      }

      if (result.text) {
        const text = result.text;
        setCyrusText(text);
        setTranscript((prev) => [...prev, { role: 'cyrus', text }]);
      }

      // Play audio response if available
      if (result.audio) {
        playAudioResponse(result.audio);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Voice conversation failed: ${errorMsg}`);
      console.error('[Voice] Conversation failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Play audio response
   */
  const playAudioResponse = (audioDataUrl: string) => {
    try {
      setIsPlaying(true);

      const audio = new Audio(audioDataUrl);
      audioPlaybackRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
      };

      audio.onerror = () => {
        setError('Failed to play audio response');
        setIsPlaying(false);
      };

      audio.play().catch((err) => {
        setError(`Audio playback failed: ${err instanceof Error ? err.message : String(err)}`);
        setIsPlaying(false);
      });
    } catch (err) {
      setError(`Audio playback error: ${err instanceof Error ? err.message : String(err)}`);
      setIsPlaying(false);
    }
  };

  /**
   * Stop audio playback
   */
  const stopPlayback = () => {
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
      audioPlaybackRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  /**
   * Clear conversation
   */
  const clearConversation = () => {
    setTranscript([]);
    setCyrusText('');
    setError(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl border border-white/10 bg-black/40 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Mic className="h-5 w-5 text-cyan-400" />
            Talk to CYRUS
          </h3>
          <p className="text-xs text-white/50 mt-1">Press the mic button and speak naturally</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex gap-3 rounded-lg border border-red-400/30 bg-red-500/10 p-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing || isPlaying}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            isRecording
              ? 'border-red-400/40 bg-red-500/20 text-red-100 hover:bg-red-500/30'
              : 'border-cyan-400/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isRecording ? (
            <>
              <Square className="h-4 w-4 animate-pulse" />
              Stop recording
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              Start recording
            </>
          )}
        </button>

        {isPlaying && (
          <button
            onClick={stopPlayback}
            className="flex items-center gap-2 rounded-lg border border-violet-400/40 bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-100 hover:bg-violet-500/25"
          >
            <Volume2 className="h-4 w-4 animate-pulse" />
            Stop playback
          </button>
        )}

        {transcript.length > 0 && (
          <button
            onClick={clearConversation}
            disabled={isRecording || isProcessing}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>

      {/* Status Indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
          <p className="text-xs text-white/70">Processing your voice...</p>
        </div>
      )}

      {/* Transcript Display */}
      {transcript.length > 0 && (
        <div className="max-h-96 overflow-y-auto space-y-3 rounded-xl border border-white/10 bg-black/50 p-4">
          {transcript.map((msg, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 ${
                msg.role === 'user'
                  ? 'border-l-2 border-cyan-400/50 bg-cyan-500/10 text-cyan-100'
                  : 'border-l-2 border-violet-400/50 bg-violet-500/10 text-violet-100'
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-60 mb-1">
                {msg.role === 'user' ? 'You' : 'CYRUS'}
              </p>
              <p className="text-xs leading-relaxed">{msg.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {transcript.length === 0 && !isRecording && !isProcessing && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <Mic className="h-8 w-8 text-white/30 mx-auto mb-2" />
          <p className="text-sm text-white/50">Press the microphone button to start a conversation</p>
        </div>
      )}
    </div>
  );
}

export default VoiceConversation;
