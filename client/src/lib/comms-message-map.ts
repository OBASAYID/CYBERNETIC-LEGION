import type { CommsMessage, MessageType } from "../components/comms/MessageBubble";

export function guessMimeFromFileName(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    mkv: "video/x-matroska",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    ogg: "audio/ogg",
    wav: "audio/wav",
    flac: "audio/flac",
    aac: "audio/aac",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    zip: "application/zip",
    txt: "text/plain",
  };
  return map[ext];
}

export type ServerMessageRow = {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: string;
  read: boolean;
  messageType?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileMimeType?: string | null;
  fileSizeBytes?: number | null;
};

export function mapServerMessageToComms(
  row: ServerMessageRow,
  getSenderName: (senderId: string) => string
): CommsMessage {
  const senderName = getSenderName(row.senderId);
  const mt = (row.messageType || "text").toLowerCase();
  const fileMime = row.fileMimeType || guessMimeFromFileName(row.fileName || null) || null;

  if (mt === "emoji") {
    return {
      id: row.id,
      senderId: row.senderId,
      senderName,
      recipientId: row.recipientId,
      content: row.content,
      timestamp: row.timestamp,
      read: row.read,
      type: "emoji",
    };
  }

  if (mt === "location") {
    let lat: number | undefined;
    let lng: number | undefined;
    let cap = row.content;
    try {
      const p = JSON.parse(row.content) as { lat?: number; lng?: number; c?: string; caption?: string };
      lat = p.lat;
      lng = p.lng;
      cap = p.c || p.caption || "";
    } catch {
      /* legacy plain text "lat, lng" */
    }
    return {
      id: row.id,
      senderId: row.senderId,
      senderName,
      recipientId: row.recipientId,
      content: cap,
      timestamp: row.timestamp,
      read: row.read,
      type: "location",
      latitude: lat,
      longitude: lng,
    };
  }

  if (mt === "voice-note" && row.fileUrl) {
    let duration: number | undefined;
    let caption = "";
    try {
      const p = JSON.parse(row.content) as { d?: number; c?: string };
      if (typeof p.d === "number") duration = p.d;
      if (typeof p.c === "string") caption = p.c;
    } catch {
      const n = parseFloat(row.content);
      if (!Number.isNaN(n)) duration = n;
    }
    return {
      id: row.id,
      senderId: row.senderId,
      senderName,
      recipientId: row.recipientId,
      content: caption,
      timestamp: row.timestamp,
      read: row.read,
      type: "voice-note",
      mediaUrl: row.fileUrl,
      mediaMimeType: fileMime || "audio/webm",
      duration,
    };
  }

  if ((mt === "media" || mt === "file") && row.fileUrl) {
    return {
      id: row.id,
      senderId: row.senderId,
      senderName,
      recipientId: row.recipientId,
      content: row.content,
      timestamp: row.timestamp,
      read: row.read,
      type: "media",
      mediaUrl: row.fileUrl,
      mediaMimeType: fileMime || undefined,
      fileName: row.fileName || undefined,
    };
  }

  if (row.fileUrl) {
    const t: MessageType = "media";
    return {
      id: row.id,
      senderId: row.senderId,
      senderName,
      recipientId: row.recipientId,
      content: row.content,
      timestamp: row.timestamp,
      read: row.read,
      type: t,
      mediaUrl: row.fileUrl,
      mediaMimeType: fileMime || undefined,
      fileName: row.fileName || undefined,
    };
  }

  if (mt === "system") {
    return {
      id: row.id,
      senderId: row.senderId,
      senderName,
      recipientId: row.recipientId,
      content: row.content,
      timestamp: row.timestamp,
      read: row.read,
      type: "system",
    };
  }

  return {
    id: row.id,
    senderId: row.senderId,
    senderName,
    recipientId: row.recipientId,
    content: row.content,
    timestamp: row.timestamp,
    read: row.read,
    type: "text",
  };
}

/** Incoming `new-message` from Socket.io */
export function fromSocketNewMessage(
  data: {
    id: string;
    senderId: string;
    senderName?: string;
    message: string;
    messageType?: string;
    timestamp: string;
    fileUrl?: string;
    fileName?: string;
    fileMimeType?: string;
    fileSizeBytes?: number;
    voiceDurationSeconds?: number;
    latitude?: number;
    longitude?: number;
  },
  myUserId: string
): CommsMessage {
  const name = (id: string) => (id === data.senderId ? (data.senderName || id) : id);
  if (data.messageType === "location" && data.latitude != null && data.longitude != null) {
    return {
      id: data.id,
      senderId: data.senderId,
      senderName: data.senderName || data.senderId,
      recipientId: myUserId,
      content: data.message,
      timestamp: data.timestamp,
      read: false,
      type: "location",
      latitude: data.latitude,
      longitude: data.longitude,
    };
  }
  if (data.messageType === "voice-note" && data.fileUrl) {
    return {
      id: data.id,
      senderId: data.senderId,
      senderName: data.senderName || data.senderId,
      recipientId: myUserId,
      content: "",
      timestamp: data.timestamp,
      read: false,
      type: "voice-note",
      mediaUrl: data.fileUrl,
      mediaMimeType: data.fileMimeType || "audio/webm",
      duration: data.voiceDurationSeconds,
    };
  }
  if ((data.messageType === "media" || data.fileUrl) && data.fileUrl) {
    const m = mapServerMessageToComms(
      {
        id: data.id,
        senderId: data.senderId,
        recipientId: myUserId,
        content: data.message,
        timestamp: data.timestamp,
        read: false,
        messageType: "media",
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileMimeType: data.fileMimeType,
        fileSizeBytes: data.fileSizeBytes,
      },
      name
    );
    m.senderName = data.senderName || m.senderName;
    return m;
  }
  if (data.messageType === "emoji") {
    return {
      id: data.id,
      senderId: data.senderId,
      senderName: data.senderName || data.senderId,
      recipientId: myUserId,
      content: data.message,
      timestamp: data.timestamp,
      read: false,
      type: "emoji",
    };
  }
  return {
    id: data.id,
    senderId: data.senderId,
    senderName: data.senderName || data.senderId,
    recipientId: myUserId,
    content: data.message,
    timestamp: data.timestamp,
    read: false,
    type: "text",
  };
}

export function fromSocketMessageSent(
  data: {
    id: string;
    recipientId: string;
    message: string;
    messageType?: string;
    timestamp: string;
    fileUrl?: string;
    fileName?: string;
    fileMimeType?: string;
    fileSizeBytes?: number;
    voiceDurationSeconds?: number;
    latitude?: number;
    longitude?: number;
  },
  myId: string,
  myName: string
): CommsMessage {
  if (data.messageType === "location" && data.latitude != null && data.longitude != null) {
    return {
      id: data.id,
      senderId: myId,
      senderName: myName,
      recipientId: data.recipientId,
      content: data.message,
      timestamp: data.timestamp,
      read: true,
      type: "location",
      latitude: data.latitude,
      longitude: data.longitude,
    };
  }
  if (data.messageType === "voice-note" && data.fileUrl) {
    return {
      id: data.id,
      senderId: myId,
      senderName: myName,
      recipientId: data.recipientId,
      content: data.message,
      timestamp: data.timestamp,
      read: true,
      type: "voice-note",
      mediaUrl: data.fileUrl,
      mediaMimeType: data.fileMimeType || "audio/webm",
      duration: data.voiceDurationSeconds,
    };
  }
  if ((data.messageType === "media" || data.fileUrl) && data.fileUrl) {
    return mapServerMessageToComms(
      {
        id: data.id,
        senderId: myId,
        recipientId: data.recipientId,
        content: data.message,
        timestamp: data.timestamp,
        read: true,
        messageType: "media",
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileMimeType: data.fileMimeType,
        fileSizeBytes: data.fileSizeBytes,
      },
      () => myName
    );
  }
  if (data.messageType === "emoji") {
    return {
      id: data.id,
      senderId: myId,
      senderName: myName,
      recipientId: data.recipientId,
      content: data.message,
      timestamp: data.timestamp,
      read: true,
      type: "emoji",
    };
  }
  return {
    id: data.id,
    senderId: myId,
    senderName: myName,
    recipientId: data.recipientId,
    content: data.message,
    timestamp: data.timestamp,
    read: true,
    type: "text",
  };
}
