import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { Send, Mic, MicOff, Camera, CameraOff, MapPin, Image as ImageIcon, X, Upload, Video, Square, Circle, Shield, Phone, Sparkles, Trash2, FileDown, Share2, Copy, Mail, MessageCircle, Facebook, Check, Paperclip, FileText } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FileUpload, FilePreviewModal } from "@/components/file-upload";
import { BiometricVerification } from "@/components/biometric-verification";
import { CommunicationPanel } from "@/components/communication-panel";
import { clearAuthSessionStorage, setSessionToken } from "@/lib/auth-storage";
import {
  EngineModulesSection,
  FusedStackSection,
  ModuleGridSection,
} from "@/components/legacy-dashboard/command-sections";
import { CameraPreviewSection } from "@/components/legacy-dashboard/camera-preview";
import { LegacyMessageFeed } from "@/components/legacy-dashboard/message-feed";
import { LegacyActionBar } from "@/components/legacy-dashboard/action-bar";
import { LegacyDashboardHeader } from "@/components/legacy-dashboard/header-bar";
import {
  LocationBarSection,
  MobileMenuSection,
} from "@/components/legacy-dashboard/shell-sections";
import { SystemStatusModal } from "@/components/legacy-dashboard/system-status-modal";
import cyrusEmblem from "@/assets/generated/cyrus_military_eagle_emblem.svg";
import { useConversations, useCreateConversation } from "@/hooks/use-conversations";
import { useMemories, useCreateMemory } from "@/hooks/use-memories";
import {
  getDesignatedModuleRouteForEngine,
} from "@/config/command-center-nav";
import { useLegacyDashboardData } from "@/hooks/use-legacy-dashboard-data";

interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
  url: string;
  isImage?: boolean;
  isVideo?: boolean;
}

interface Message {
  id: string;
  role: "user" | "cyrus";
  content: string;
  timestamp: Date;
  hasImage?: boolean;
  imageUrl?: string;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

interface MemoryItem {
  id: string;
  type: "person" | "place" | "thing" | "conversation";
  description: string;
  timestamp: Date;
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data: conversationsData } = useConversations(undefined, 50);
  const { data: memoriesData } = useMemories();
  const createConversation = useCreateConversation();
  const createMemory = useCreateMemory();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "cyrus",
      content: "Hello! I'm CYRUS - your intelligent AI companion. I can see through your camera, hear you speak, know your location, and remember our conversations. How can I help you today?",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isContinuousListening, setIsContinuousListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [testModeActive, setTestModeActive] = useState(false);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [savedPhotos, setSavedPhotos] = useState<{id: string; data: string; timestamp: Date}[]>([]);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [showCommunication, setShowCommunication] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  
  const [pendingAttachment, setPendingAttachment] = useState<{file: File; preview: string; type: string} | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [predictions, setPredictions] = useState<cocoSsd.DetectedObject[]>([]);
  const requestAnimationFrameId = useRef<number | null>(null);

  const [showSystemStatus, setShowSystemStatus] = useState(false);
  const [cyrusStatus, setCyrusStatus] = useState<any>(null);
  const [domainInfo, setDomainInfo] = useState<any>(null);
  const [aiBranches, setAiBranches] = useState<any[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  
  const [shareMessageId, setShareMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeProgress, setUpgradeProgress] = useState(0);
  const [upgradePhase, setUpgradePhase] = useState("");
  const [upgradeComplete, setUpgradeComplete] = useState(false);

  const shareToWhatsApp = useCallback((content: string) => {
    const text = encodeURIComponent(`From CYRUS AI:\n\n${content}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setShareMessageId(null);
  }, []);

  const shareToFacebook = useCallback((content: string) => {
    const text = encodeURIComponent(`From CYRUS AI:\n\n${content}`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
    setShareMessageId(null);
  }, []);

  const shareToEmail = useCallback((content: string) => {
    const subject = encodeURIComponent('CYRUS AI - Shared Content');
    const body = encodeURIComponent(`From CYRUS AI:\n\n${content}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    setShareMessageId(null);
  }, []);

  const copyToClipboard = useCallback(async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
      setShareMessageId(null);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const initiateSystemUpgrade = useCallback(async () => {
    setIsUpgrading(true);
    setUpgradeProgress(0);
    setUpgradePhase("Initializing...");
    setUpgradeComplete(false);
    
    try {
      const response = await fetch('/api/cyrus/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upgradeType: 'full' })
      });
      
      if (!response.ok) throw new Error('Upgrade failed');
      
      const data = await response.json();
      
      // Animate through phases
      for (const phase of data.phases) {
        setUpgradePhase(phase.message);
        setUpgradeProgress(phase.progress);
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      setUpgradeComplete(true);
      
      // Refresh status after upgrade
      setTimeout(() => {
        Promise.all([
          fetch('/api/cyrus/status').then(r => r.json()),
          fetch('/api/cyrus/branches').then(r => r.json()),
          fetch('/api/cyrus/domains').then(r => r.json())
        ]).then(([status, branches, domains]) => {
          setCyrusStatus(status);
          setAiBranches(branches);
          setDomainInfo(domains);
        });
      }, 1000);
      
    } catch (error) {
      console.error('Upgrade failed:', error);
      setUpgradePhase("Upgrade failed. Please try again.");
    } finally {
      setTimeout(() => {
        setIsUpgrading(false);
        setUpgradeProgress(0);
      }, 3000);
    }
  }, []);

  useEffect(() => {
    if (showSystemStatus) {
      setIsLoadingStatus(true);
      Promise.all([
        fetch('/api/cyrus/status').then(r => r.json()),
        fetch('/api/cyrus/branches').then(r => r.json()),
        fetch('/api/cyrus/domains').then(r => r.json())
      ]).then(([status, branches, domains]) => {
        setCyrusStatus(status);
        setAiBranches(branches);
        setDomainInfo(domains);
        setIsLoadingStatus(false);
      }).catch(err => {
        console.error('Failed to fetch CYRUS status:', err);
        setIsLoadingStatus(false);
      });
    }
  }, [showSystemStatus]);

  const memories = memoriesData?.map(m => ({
    id: m.id,
    type: m.type as "person" | "place" | "thing" | "conversation",
    description: m.description,
    timestamp: new Date(m.createdAt)
  })) || [];
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const shouldRestartRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const lastMessageTimeRef = useRef(0);
  const processingRef = useRef(false);
  const lastSpeakEndRef = useRef<number>(0);
  const recentCyrusWordsRef = useRef<string[]>([]);
  const DEBOUNCE_MS = 1000;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (conversationsData && conversationsData.length > 0) {
      const dbMessages: Message[] = conversationsData.map(conv => ({
        id: conv.id,
        role: conv.role as "user" | "cyrus",
        content: conv.content,
        timestamp: new Date(conv.createdAt),
        hasImage: !!conv.hasImage
      }));
      
      if (!dbMessages.some(m => m.id === "welcome")) {
        setMessages([
          {
            id: "welcome",
            role: "cyrus",
            content: "Hello! I'm CYRUS - your intelligent AI companion. I can see through your camera, hear you speak, know your location, and remember our conversations. How can I help you today?",
            timestamp: new Date()
          },
          ...dbMessages
        ]);
      } else {
        setMessages(dbMessages);
      }
    }
  }, [conversationsData]);
  
  useEffect(() => {
    const saved = localStorage.getItem("cyrus_photos");
    if (saved) {
      setSavedPhotos(JSON.parse(saved));
    }
  }, []);

  const saveMemory = useCallback(async (memory: Omit<MemoryItem, "id">) => {
    await createMemory.mutateAsync({
      userId: null,
      type: memory.type,
      description: memory.description
    });
  }, [createMemory]);

  const clearChatHistory = useCallback(async () => {
    try {
      await fetch('/api/conversations', { method: 'DELETE' });
      setMessages([{
        id: "welcome",
        role: "cyrus",
        content: "Chat history cleared. I'm ready to assist you.",
        timestamp: new Date()
      }]);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    } catch (error) {
      console.error('Failed to clear chat:', error);
    }
  }, [queryClient]);

  const handleChatFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const type = file.type.startsWith('image/') ? 'image' : 
                   file.type.startsWith('video/') ? 'video' : 'document';
      
      if (type === 'image') {
        const reader = new FileReader();
        reader.onload = (event) => {
          setPendingAttachment({
            file,
            preview: event.target?.result as string,
            type
          });
        };
        reader.readAsDataURL(file);
      } else {
        setPendingAttachment({
          file,
          preview: file.name,
          type
        });
      }
    }
    if (chatFileInputRef.current) {
      chatFileInputRef.current.value = '';
    }
  }, []);

  const uploadAndSendFile = useCallback(async () => {
    if (!pendingAttachment) return;
    
    setIsThinking(true);
    
    try {
      const formData = new FormData();
      formData.append('file', pendingAttachment.file);
      
      const uploadResponse = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }
      
      const uploadedFile = await uploadResponse.json();
      
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: inputText || `Sent a ${pendingAttachment.type}: ${pendingAttachment.file.name}`,
        timestamp: new Date(),
        hasImage: pendingAttachment.type === 'image',
        imageUrl: pendingAttachment.type === 'image' ? (pendingAttachment.preview || uploadedFile.url) : undefined
      };
      setMessages(prev => [...prev, userMessage]);
      
      await createConversation.mutateAsync({
        userId: null,
        role: 'user',
        content: userMessage.content,
        hasImage: pendingAttachment.type === 'image' ? 1 : 0,
        imageData: pendingAttachment.type === 'image' ? pendingAttachment.preview : null,
        detectedObjects: null
      });
      
      const analysisPrompt = pendingAttachment.type === 'image' 
        ? `I've uploaded an image: ${pendingAttachment.file.name}. Please analyze it.`
        : `I've uploaded a ${pendingAttachment.type}: ${pendingAttachment.file.name}. ${inputText || 'Please review it.'}`;
      
      const aiResponse = await fetch('/api/cyrus/infer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: analysisPrompt,
          conversationHistory: messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
          context: {
            uploadedFile: {
              name: pendingAttachment.file.name,
              type: pendingAttachment.type,
              size: pendingAttachment.file.size,
              url: uploadedFile.url
            }
          }
        })
      });
      
      const result = await aiResponse.json().catch(() => ({} as { response?: string; error?: string }));
      const replyText =
        (typeof result.response === "string" && result.response) ||
        (typeof result.error === "string" && result.error) ||
        (aiResponse.ok
          ? `I've received your ${pendingAttachment.type}. How can I help you with it?`
          : "I couldn't complete that request. Please try again.");
      const cyrusMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "cyrus",
        content: replyText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, cyrusMessage]);
      if (aiResponse.ok || (typeof result.response === "string" && result.response)) {
        await createConversation.mutateAsync({
          userId: null,
          role: "cyrus",
          content: cyrusMessage.content,
          hasImage: 0,
          imageData: null,
          detectedObjects: null,
        });
      }
      
      setPendingAttachment(null);
      setInputText('');
    } catch (error) {
      console.error('File upload error:', error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'cyrus',
        content: 'I had trouble processing that file. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  }, [pendingAttachment, inputText, messages, createConversation]);

  const exportConversation = useCallback(() => {
    const doc = messages.map(m => {
      const timestamp = m.timestamp.toLocaleString();
      const role = m.role === 'cyrus' ? 'CYRUS' : 'USER';
      return `[${timestamp}] ${role}:\n${m.content}\n`;
    }).join('\n---\n\n');
    
    const header = `═══════════════════════════════════════════════════════════════
                           CYRUS AI COMPANION
                        CONVERSATION TRANSCRIPT
═══════════════════════════════════════════════════════════════

Generated: ${new Date().toLocaleString()}
Total Messages: ${messages.length}

═══════════════════════════════════════════════════════════════

`;
    
    const fullDoc = header + doc;
    const blob = new Blob([fullDoc], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cyrus-transcript-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [messages]);

  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        const loadedModel = await cocoSsd.load();
        setModel(loadedModel);
      } catch (err) {
        console.error("Failed to load object detection model", err);
      }
    };
    loadModel();
  }, []);

  const detectFrame = useCallback(async (video: HTMLVideoElement, model: cocoSsd.ObjectDetection) => {
    if (!canvasRef.current) return;
    
    try {
      if (video.readyState === 4) {
        const predictions = await model.detect(video);
        setPredictions(predictions);
        
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          
          if (ctx.canvas.width !== video.videoWidth || ctx.canvas.height !== video.videoHeight) {
            ctx.canvas.width = video.videoWidth;
            ctx.canvas.height = video.videoHeight;
          }

          predictions.forEach(prediction => {
            const [x, y, width, height] = prediction.bbox;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.fillRect(x, y - 24, prediction.class.length * 10 + 40, 24);
            ctx.fillStyle = "#ffffff";
            ctx.font = "14px -apple-system, BlinkMacSystemFont, sans-serif";
            ctx.fillText(
              `${prediction.class} ${Math.round(prediction.score * 100)}%`,
              x + 6,
              y - 7
            );
          });
        }
      }
      
      requestAnimationFrameId.current = requestAnimationFrame(() => detectFrame(video, model));
    } catch (err) {
      setTimeout(() => {
        if (cameraActive) {
          requestAnimationFrameId.current = requestAnimationFrame(() => detectFrame(video, model));
        }
      }, 1000);
    }
  }, [cameraActive]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date()
          });
          setLocationError(null);
        },
        (error) => {
          setLocationError(error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);


  const [currentVolume, setCurrentVolume] = useState(1);
  const currentTextRef = useRef<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  const handleVoiceCommand = useCallback((command: string): boolean => {
    const cmd = command.toLowerCase().trim();
    
    if (cmd.includes("stop") || cmd.includes("wait") || cmd.includes("pause") || 
        cmd.includes("quiet") || cmd.includes("shut up") || cmd.includes("hold on")) {
      stopSpeaking();
      return true;
    }
    
    if (cmd.includes("lower") || cmd.includes("quieter") || cmd.includes("softer")) {
      const newVolume = Math.max(0.3, currentVolume - 0.3);
      setCurrentVolume(newVolume);
      if (audioRef.current) {
        audioRef.current.volume = newVolume;
      }
      return true;
    }
    
    if (cmd.includes("louder") || cmd.includes("speak up") || cmd.includes("volume up")) {
      const newVolume = Math.min(1, currentVolume + 0.3);
      setCurrentVolume(newVolume);
      if (audioRef.current) {
        audioRef.current.volume = newVolume;
      }
      return true;
    }
    
    return false;
  }, [currentVolume, stopSpeaking]);

  const speak = useCallback(async (text: string) => {
    currentTextRef.current = text;
    
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    recentCyrusWordsRef.current = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    try {
      // Use OpenAI's high-quality TTS via backend
      const response = await fetch('/api/cyrus/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'nova' })
      });
      
      if (!response.ok) {
        throw new Error('TTS request failed');
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audio.volume = currentVolume;
      audioRef.current = audio;
      
      audio.onended = () => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        lastSpeakEndRef.current = Date.now();
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setTimeout(() => {
          currentTextRef.current = "";
          recentCyrusWordsRef.current = [];
        }, 2000);
      };
      
      audio.onerror = () => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        audioRef.current = null;
      };
      
      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      isSpeakingRef.current = false;
      setIsSpeaking(false);
    }
  }, [currentVolume]);

  const captureImage = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setLastCapture(imageData);
    return imageData;
  }, []);

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; imageData?: string | null; detectedObjects?: cocoSsd.DetectedObject[] }) => {
      const response = await fetch('/api/cyrus/infer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: data.message,
          imageData: data.imageData || null,
          conversationHistory: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          })),
          context: {
            detectedObjects: data.detectedObjects || [],
            location: location,
            hasCamera: cameraActive,
            summary: `Camera: ${cameraActive ? 'active' : 'inactive'}, Objects: ${data.detectedObjects?.length || 0}`
          }
        })
      });
      
      const result = (await response.json().catch(() => ({}))) as {
        response?: string;
        error?: string;
      };
      const text =
        (typeof result.response === "string" && result.response) ||
        (typeof result.error === "string" && result.error) ||
        "Failed to get AI response";
      if (!response.ok && !result.response) {
        throw new Error(text);
      }
      return { response: text };
    },
    onSuccess: async (data, variables) => {
      const responseText = data.response || "I'm here to help. What would you like to know?";
      const cyrusMessage: Message = {
        id: Date.now().toString(),
        role: "cyrus",
        content: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, cyrusMessage]);
      setIsThinking(false);
      speak(responseText);
      
      await createConversation.mutateAsync({
        userId: null,
        role: "cyrus",
        content: responseText,
        hasImage: 0,
        imageData: null,
        detectedObjects: null
      });
      
      saveMemory({
        type: "conversation",
        description: `User: "${variables.message}" | CYRUS: "${responseText.substring(0, 100)}..."`,
        timestamp: new Date()
      });
    },
    onError: () => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "cyrus",
        content: "I apologize, I'm having trouble connecting right now. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsThinking(false);
    }
  });

  const isPhotoCommand = useCallback((text: string): boolean => {
    const cmd = text.toLowerCase();
    return cmd.includes("take my picture") || cmd.includes("take a picture") ||
           cmd.includes("take a photo") || cmd.includes("take my photo") ||
           cmd.includes("photograph me") || cmd.includes("snap a photo") ||
           cmd.includes("capture me") || cmd.includes("selfie") ||
           cmd.includes("what do you see") || cmd.includes("look at me") ||
           cmd.includes("describe what you see") || cmd.includes("can you see me") ||
           cmd.includes("what am i wearing") || cmd.includes("how do i look");
  }, []);
  
  const savePhoto = useCallback((imageData: string) => {
    const newPhoto = {
      id: Date.now().toString(),
      data: imageData,
      timestamp: new Date()
    };
    setSavedPhotos(prev => {
      const updated = [...prev, newPhoto];
      localStorage.setItem("cyrus_photos", JSON.stringify(updated.slice(-20)));
      return updated.slice(-20);
    });
  }, []);

  const handleSendMessage = useCallback(async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;
    
    const now = Date.now();
    if (processingRef.current || now - lastMessageTimeRef.current < DEBOUNCE_MS) {
      return;
    }
    
    if (isThinking) return;
    
    processingRef.current = true;
    lastMessageTimeRef.current = now;

    const needsVision = isPhotoCommand(messageText);
    
    let imageData: string | null = null;
    if (cameraActive) {
      imageData = captureImage();
      if (imageData && needsVision) {
        savePhoto(imageData);
      }
    } else if (needsVision) {
      const hintMessage: Message = {
        id: Date.now().toString() + "-hint",
        role: "cyrus",
        content: "I'd love to see you, but my camera isn't turned on yet. Please enable the camera so I can see!",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, hintMessage]);
      speak("I'd love to see you, but my camera isn't turned on yet. Please enable the camera so I can see!");
      processingRef.current = false;
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
      hasImage: !!imageData
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsThinking(true);
    
    await createConversation.mutateAsync({
      userId: null,
      role: "user",
      content: messageText,
      hasImage: imageData ? 1 : 0,
      imageData: imageData,
      detectedObjects: predictions.length > 0 ? predictions : null
    });

    sendMessageMutation.mutate({ 
      message: messageText, 
      imageData,
      detectedObjects: predictions
    });
    
    processingRef.current = false;
  }, [inputText, isThinking, predictions, cameraActive, captureImage, savePhoto, isPhotoCommand, sendMessageMutation, speak, createConversation]);

  const toggleContinuousListening = useCallback(async () => {
    if (isContinuousListening) {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsContinuousListening(false);
      setIsListening(false);
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
        return;
      }
      
      // Request microphone permission explicitly
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      } catch (permError) {
        console.error("Microphone permission error:", permError);
        alert("Microphone access denied. Please allow microphone access to use voice features.");
        return;
      }
      
      shouldRestartRef.current = true;
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true; // Enable interim results for better responsiveness
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        setIsListening(true);
        console.log("[CYRUS] Voice recognition started - listening...");
      };
      
      recognition.onend = () => {
        setIsListening(false);
        if (shouldRestartRef.current) {
          setTimeout(() => {
            try { 
              recognition.start(); 
              console.log("[CYRUS] Voice recognition restarted");
            } catch (e) {
              console.error("[CYRUS] Failed to restart recognition:", e);
            }
          }, 300);
        }
      };
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Get the latest result
        const lastResultIndex = event.results.length - 1;
        const result = event.results[lastResultIndex];
        
        // Only process final results (not interim)
        if (!result.isFinal) return;
        
        const transcript = result[0].transcript.trim();
        if (!transcript) return;
        
        console.log("[CYRUS] Voice recognized:", transcript);
        
        if (isSpeakingRef.current) {
          const handled = handleVoiceCommand(transcript);
          if (handled) return;
        }
        
        const timeSinceSpeakEnd = Date.now() - lastSpeakEndRef.current;
        if (timeSinceSpeakEnd < 1500) return;
        
        const words = transcript.toLowerCase().split(/\s+/);
        const overlap = words.filter(w => recentCyrusWordsRef.current.includes(w)).length;
        if (overlap > words.length * 0.4) return;
        
        handleSendMessage(transcript);
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("[CYRUS] Voice recognition error:", event.error);
        if (event.error === "aborted" || event.error === "no-speech") return;
        if (event.error === "not-allowed") {
          alert("Microphone access was denied. Please enable microphone access in your browser settings.");
          setIsContinuousListening(false);
        }
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
      setIsContinuousListening(true);
      
      try { 
        recognition.start(); 
        console.log("[CYRUS] Voice recognition initialized successfully");
      } catch (e) {
        console.error("[CYRUS] Failed to start recognition:", e);
        alert("Failed to start voice recognition. Please try again.");
        setIsContinuousListening(false);
      }
    }
  }, [isContinuousListening, handleSendMessage, handleVoiceCommand]);

  const toggleCamera = useCallback(async () => {
    if (cameraActive) {
      if (requestAnimationFrameId.current) {
        cancelAnimationFrame(requestAnimationFrameId.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setCameraActive(false);
      setTestModeActive(false);
      setPredictions([]);
    } else {
      try {
        // Request camera permission with environment preference for mobile back camera
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { ideal: "environment" }, // Prefer back camera
            width: { ideal: 1920 }, 
            height: { ideal: 1080 } 
          } 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for video to be ready
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(console.error);
          };
        }
        setCameraActive(true);
        setLocationError(null); // Clear any previous errors
        
        if (model && videoRef.current) {
          requestAnimationFrameId.current = requestAnimationFrame(() => detectFrame(videoRef.current!, model));
        }
      } catch (err: any) {
        console.error("Camera error:", err);
        if (err.name === 'NotAllowedError') {
          setLocationError("Camera permission denied. Please allow camera access in your browser settings and try again.");
        } else if (err.name === 'NotFoundError') {
          setLocationError("No camera found. Please connect a camera and try again.");
        } else {
          setLocationError("Could not access camera. Please check your device settings.");
        }
      }
    }
  }, [cameraActive, model, detectFrame]);

  const toggleTestMode = useCallback(() => {
    if (testModeActive) {
      setTestModeActive(false);
      setCameraActive(false);
      setPredictions([]);
    } else {
      setTestModeActive(true);
      setCameraActive(true);
      setPredictions([
        { class: "person", score: 0.95, bbox: [100, 50, 200, 300] },
        { class: "laptop", score: 0.88, bbox: [350, 200, 150, 100] }
      ]);
    }
  }, [testModeActive]);

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    if (!streamRef.current) return;
    
    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cyrus-recording-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100);
    setIsRecording(true);
    setRecordingDuration(0);
    
    recordingIntervalRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  }, [isRecording]);

  const handleFileAnalyze = useCallback(async (file: UploadedFile) => {
    setSelectedFile(null);
    
    const analysisMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: `Analyze this ${file.isImage ? "image" : file.isVideo ? "video" : "file"}: ${file.originalName}`,
      timestamp: new Date(),
      hasImage: file.isImage || file.isVideo
    };
    setMessages(prev => [...prev, analysisMessage]);
    
    if (file.isImage) {
      try {
        const response = await fetch(file.url);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          sendMessageMutation.mutate({ 
            message: `Analyze this uploaded image: ${file.originalName}`, 
            imageData: base64data 
          });
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("Error analyzing file:", error);
      }
    } else {
      sendMessageMutation.mutate({ 
        message: `The user uploaded a file: ${file.originalName} (${file.mimetype}, ${(file.size / 1024).toFixed(1)}KB)`,
        imageData: null
      });
    }
  }, [sendMessageMutation]);

  const handleLogout = () => {
    clearAuthSessionStorage();
    if (recognitionRef.current) {
      shouldRestartRef.current = false;
      try { recognitionRef.current.stop(); } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    window.location.reload();
  };

  const { navItems, navLabelByRoute, orchestratorModules, stackSummary } = useLegacyDashboardData();

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <LegacyDashboardHeader
        navItems={navItems}
        logoSrc={cyrusEmblem}
        isContinuousListening={isContinuousListening}
        cameraActive={cameraActive}
        location={location}
        isSpeaking={isSpeaking}
        showMenu={showMenu}
        onToggleMenu={() => setShowMenu(!showMenu)}
        onOpenSystemStatus={() => setShowSystemStatus(true)}
        onLogout={handleLogout}
      />

      <MobileMenuSection showMenu={showMenu} navItems={navItems} />

      <CameraPreviewSection
        cameraActive={cameraActive}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        predictions={predictions}
        videoRef={videoRef}
        canvasRef={canvasRef}
        onToggleCamera={toggleCamera}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onCapturePhoto={() => {
          const img = captureImage();
          if (img) savePhoto(img);
        }}
        formatRecordingTime={formatRecordingTime}
      />

      <LocationBarSection location={location} locationError={locationError} />

      <FusedStackSection stackSummary={stackSummary} />
      <ModuleGridSection navItems={navItems} />
      <EngineModulesSection
        orchestratorModules={orchestratorModules}
        navLabelByRoute={navLabelByRoute}
        getDesignatedModuleRouteForEngine={getDesignatedModuleRouteForEngine}
      />

      <LegacyMessageFeed
        messages={messages}
        isThinking={isThinking}
        cyrusEmblem={cyrusEmblem}
        shareMessageId={shareMessageId}
        copiedMessageId={copiedMessageId}
        setShareMessageId={setShareMessageId}
        shareToWhatsApp={shareToWhatsApp}
        shareToFacebook={shareToFacebook}
        shareToEmail={shareToEmail}
        copyToClipboard={copyToClipboard}
        messagesEndRef={messagesEndRef}
      />

      <LegacyActionBar
        isContinuousListening={isContinuousListening}
        cameraActive={cameraActive}
        isRecording={isRecording}
        showFileUpload={showFileUpload}
        showBiometric={showBiometric}
        showCommunication={showCommunication}
        savedPhotosCount={savedPhotos.length}
        isThinking={isThinking}
        pendingAttachment={pendingAttachment}
        inputText={inputText}
        isListening={isListening}
        chatFileInputRef={chatFileInputRef}
        onToggleContinuousListening={toggleContinuousListening}
        onToggleCamera={toggleCamera}
        onToggleFileUpload={() => setShowFileUpload(!showFileUpload)}
        onToggleBiometric={() => setShowBiometric(!showBiometric)}
        onToggleCommunication={() => setShowCommunication(!showCommunication)}
        onOpenGallery={() => setShowPhotoGallery(true)}
        onExportConversation={exportConversation}
        onClearChatHistory={clearChatHistory}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onFileSelect={(file) => setSelectedFile(file)}
        onAnalyzeFile={handleFileAnalyze}
        onInputChange={setInputText}
        onFileInputChange={handleChatFileSelect}
        onRemoveAttachment={() => setPendingAttachment(null)}
        onSend={() => (pendingAttachment ? uploadAndSendFile() : handleSendMessage())}
        onMessage={() => {
          const msg: Message = {
            id: Date.now().toString(),
            role: "cyrus",
            content: "Identity verified. Access granted.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, msg]);
        }}
      />

      {/* Photo Gallery Modal */}
      {showPhotoGallery && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">Photos</h2>
            <button
              onClick={() => setShowPhotoGallery(false)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              data-testid="button-close-gallery"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {savedPhotos.map((photo) => (
                <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden group" data-testid={`photo-${photo.id}`}>
                  <img src={photo.data} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <SystemStatusModal
        show={showSystemStatus}
        isLoadingStatus={isLoadingStatus}
        aiBranches={aiBranches}
        domainInfo={domainInfo}
        cyrusStatus={cyrusStatus}
        isUpgrading={isUpgrading}
        upgradePhase={upgradePhase}
        upgradeProgress={upgradeProgress}
        upgradeComplete={upgradeComplete}
        onClose={() => setShowSystemStatus(false)}
        onUpgrade={initiateSystemUpgrade}
      />
    </div>
  );
}
