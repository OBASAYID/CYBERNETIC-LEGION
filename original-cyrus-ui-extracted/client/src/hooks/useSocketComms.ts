import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface User {
  id: string;
  displayName: string;
  deviceId: string;
  inCall: boolean;
}

interface IncomingCallData {
  callerId: string;
  callerName: string;
  roomId: string;
  callType: 'audio' | 'video';
}

interface Message {
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
}

interface UseSocketCommsOptions {
  displayName: string;
  onIncomingCall?: (data: IncomingCallData) => void;
  onCallAccepted?: (data: { roomId: string; peerName: string; peerId: string }) => void;
  onCallDeclined?: (data: { roomId: string }) => void;
  onCallConnected?: (data: { roomId: string; peerName: string; peerId: string; isInitiator: boolean }) => void;
  onCallEnded?: (data: { roomId: string; reason?: string }) => void;
  onNewMessage?: (data: Message) => void;
  onWebRTCOffer?: (data: { offer: RTCSessionDescriptionInit }) => void;
  onWebRTCAnswer?: (data: { answer: RTCSessionDescriptionInit }) => void;
  onWebRTCIceCandidate?: (data: { candidate: RTCIceCandidateInit }) => void;
}

export function useSocketComms(options: UseSocketCommsOptions) {
  const { displayName, onIncomingCall, onCallAccepted, onCallDeclined, onCallConnected, onCallEnded, onNewMessage, onWebRTCOffer, onWebRTCAnswer, onWebRTCIceCandidate } = options;
  
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  
  useEffect(() => {
    if (!displayName) return;

    const deviceId = localStorage.getItem('cyrus_device_id') || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('cyrus_device_id', deviceId);
    
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    console.log('[SocketComms] Connecting to Socket.IO server...');
    
    const socket = io(window.location.origin, {
      path: '/cyrus-io',
      transports: ['polling'],
      upgrade: false,
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SocketComms] Connected, registering user...');
      socket.emit('register', { userId, displayName, deviceId });
    });

    socket.on('registered', (data) => {
      console.log('[SocketComms] Registered:', data);
      setMyUserId(data.userId);
      setIsConnected(true);
    });

    socket.on('presence-update', (data: { users: User[]; total: number }) => {
      console.log('[SocketComms] Presence update:', data.total, 'users online');
      setOnlineUsers(data.users);
    });

    socket.on('incoming-call', (data: IncomingCallData) => {
      console.log('[SocketComms] INCOMING CALL:', data);
      onIncomingCall?.(data);
    });

    socket.on('call-ringing', (data) => {
      console.log('[SocketComms] Call ringing to:', data.targetName);
    });

    socket.on('call-accepted', (data) => {
      console.log('[SocketComms] Call accepted:', data);
      setCurrentRoomId(data.roomId);
      onCallAccepted?.(data);
    });

    socket.on('call-connected', (data) => {
      console.log('[SocketComms] Call connected:', data);
      setCurrentRoomId(data.roomId);
      onCallConnected?.(data);
    });

    socket.on('call-declined', (data) => {
      console.log('[SocketComms] Call declined');
      onCallDeclined?.(data);
    });

    socket.on('call-ended', (data) => {
      console.log('[SocketComms] Call ended:', data);
      setCurrentRoomId(null);
      onCallEnded?.(data);
    });

    socket.on('call-failed', (data) => {
      console.log('[SocketComms] Call failed:', data.reason);
      alert(`Call failed: ${data.reason}`);
    });

    socket.on('new-message', (data: Message) => {
      console.log('[SocketComms] New message from:', data.senderName);
      onNewMessage?.(data);
    });

    socket.on('webrtc-offer', (data) => {
      console.log('[SocketComms] WebRTC offer received');
      onWebRTCOffer?.(data);
    });

    socket.on('webrtc-answer', (data) => {
      console.log('[SocketComms] WebRTC answer received');
      onWebRTCAnswer?.(data);
    });

    socket.on('webrtc-ice-candidate', (data) => {
      onWebRTCIceCandidate?.(data);
    });

    socket.on('disconnect', () => {
      console.log('[SocketComms] Disconnected');
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [displayName]);

  const callUser = useCallback((targetUserId: string, callType: 'audio' | 'video' = 'video') => {
    if (socketRef.current) {
      console.log('[SocketComms] Calling user:', targetUserId);
      socketRef.current.emit('call-user', { targetUserId, callType });
    }
  }, []);

  const acceptCall = useCallback((roomId: string) => {
    if (socketRef.current) {
      console.log('[SocketComms] Accepting call:', roomId);
      socketRef.current.emit('accept-call', { roomId });
    }
  }, []);

  const declineCall = useCallback((roomId: string) => {
    if (socketRef.current) {
      console.log('[SocketComms] Declining call:', roomId);
      socketRef.current.emit('decline-call', { roomId });
    }
  }, []);

  const endCall = useCallback((roomId: string) => {
    if (socketRef.current) {
      console.log('[SocketComms] Ending call:', roomId);
      socketRef.current.emit('end-call', { roomId });
      setCurrentRoomId(null);
    }
  }, []);

  const sendMessage = useCallback((targetUserId: string, message: string) => {
    if (socketRef.current) {
      console.log('[SocketComms] Sending message to:', targetUserId);
      socketRef.current.emit('send-message', {
        targetUserId,
        message,
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  const sendWebRTCOffer = useCallback((roomId: string, offer: RTCSessionDescriptionInit) => {
    if (socketRef.current) {
      socketRef.current.emit('webrtc-offer', { roomId, offer });
    }
  }, []);

  const sendWebRTCAnswer = useCallback((roomId: string, answer: RTCSessionDescriptionInit) => {
    if (socketRef.current) {
      socketRef.current.emit('webrtc-answer', { roomId, answer });
    }
  }, []);

  const sendWebRTCIceCandidate = useCallback((roomId: string, candidate: RTCIceCandidateInit) => {
    if (socketRef.current) {
      socketRef.current.emit('webrtc-ice-candidate', { roomId, candidate });
    }
  }, []);

  return {
    isConnected,
    myUserId,
    onlineUsers,
    currentRoomId,
    callUser,
    acceptCall,
    declineCall,
    endCall,
    sendMessage,
    sendWebRTCOffer,
    sendWebRTCAnswer,
    sendWebRTCIceCandidate,
  };
}
