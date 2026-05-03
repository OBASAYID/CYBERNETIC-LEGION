import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  systemFetch,
  resolveCyrusWebSocketUrl,
  appendCommSignalingTokenToSearchParams,
} from "@/lib/system-api";

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  summary: string;
  publishedAt: string;
}

export function useComms() {
  const { toast } = useToast();
  const [roomId, setRoomId] = useState("");
  const [remoteRoom, setRemoteRoom] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [toUser, setToUser] = useState("");
  const [fromUser, setFromUser] = useState("");
  const [msgText, setMsgText] = useState("");
  const [newsTopic, setNewsTopic] = useState("technology");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [reminderText, setReminderText] = useState("");
  const [reminderTime, setReminderTime] = useState("");

  const createRoom = async () => {
    const res = await systemFetch("/api/comms/room", { method: "POST" });
    const data = await res.json();
    setRoomId(data.roomId);
    setRemoteRoom(data.roomId);
    toast({ title: "Room created", description: data.roomId });
  };

  const startCall = async (video: boolean) => {
    if (!remoteRoom) {
      toast({ title: "Set room ID", variant: "destructive" });
      return;
    }
    const q = new URLSearchParams();
    q.set("room", remoteRoom);
    appendCommSignalingTokenToSearchParams(q);
    const wsConn = new WebSocket(resolveCyrusWebSocketUrl(`/ws?${q.toString()}`));
    setWs(wsConn);
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pcRef.current = pc;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      video: video ? { width: 640, height: 360, frameRate: 15 } : false,
    });
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    wsConn.onmessage = async (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "offer") {
        await pc.setRemoteDescription(msg.payload);
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);
        wsConn.send(JSON.stringify({ type: "answer", roomId: remoteRoom, payload: ans }));
      } else if (msg.type === "answer") {
        await pc.setRemoteDescription(msg.payload);
      } else if (msg.type === "candidate") {
        await pc.addIceCandidate(msg.payload);
      }
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) wsConn.send(JSON.stringify({ type: "candidate", roomId: remoteRoom, payload: e.candidate }));
    };
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: video });
    await pc.setLocalDescription(offer);
    wsConn.send(JSON.stringify({ type: "offer", roomId: remoteRoom, payload: offer }));
    toast({ title: "Call started", description: video ? "Video" : "Audio" });
  };

  const sendMessage = async () => {
    if (!toUser || !fromUser || !msgText) {
      toast({ title: "Fill to/from/text", variant: "destructive" });
      return;
    }
    const res = await systemFetch("/api/comms/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: toUser, from: fromUser, text: msgText }),
    });
    const data = await res.json();
    if (!res.ok) return toast({ title: "Send failed", description: data.error, variant: "destructive" });
    setMsgText("");
    toast({ title: "Message queued" });
  };

  const fetchMessages = async () => {
    if (!fromUser) {
      toast({ title: "Set your user id", variant: "destructive" });
      return;
    }
    const res = await systemFetch(`/api/comms/messages?user=${encodeURIComponent(fromUser)}`);
    const data = await res.json();
    if (!res.ok) return toast({ title: "Fetch failed", description: data.error, variant: "destructive" });
    setMessages((prev) => [...prev, ...data.messages.map((m: any) => `${m.from}: ${m.text}`)]);
  };

  const loadNews = async () => {
    const res = await systemFetch(`/api/news?topics=${encodeURIComponent(newsTopic)}&limit=5`);
    const data = await res.json();
    if (!res.ok) return toast({ title: "News failed", description: data.error, variant: "destructive" });
    setNews(data.items || []);
  };

  const createReminder = async () => {
    if (!reminderText || !reminderTime) {
      toast({ title: "Reminder text/time required", variant: "destructive" });
      return;
    }
    const res = await systemFetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: reminderText, time: Number(reminderTime), type: "official" }),
    });
    const data = await res.json();
    if (!res.ok) return toast({ title: "Reminder failed", description: data.error, variant: "destructive" });
    toast({ title: "Reminder scheduled", description: new Date(data.time).toLocaleString() });
    setReminderText("");
    setReminderTime("");
  };

  useEffect(() => {
    loadNews();
  }, []);

  return {
    roomId,
    remoteRoom,
    setRemoteRoom,
    messages,
    toUser,
    setToUser,
    fromUser,
    setFromUser,
    msgText,
    setMsgText,
    newsTopic,
    setNewsTopic,
    news,
    reminderText,
    setReminderText,
    reminderTime,
    setReminderTime,
    createRoom,
    startCall,
    sendMessage,
    fetchMessages,
    loadNews,
    createReminder,
  };
}

