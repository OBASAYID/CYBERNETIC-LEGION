import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useComms } from "@/hooks/useComms";

export default function Comms() {
  const {
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
  } = useComms();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Comms & Ops</h1>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle>Calls (WebRTC)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Button onClick={createRoom}>Create Room</Button>
              <Input placeholder="Room ID" value={remoteRoom} onChange={(e) => setRemoteRoom(e.target.value)} />
              <Button onClick={() => startCall(false)}>Start Audio</Button>
              <Button onClick={() => startCall(true)} variant="outline">Start Video</Button>
            </div>
            <div className="text-xs text-slate-400">Room: {roomId || "-"}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle>Messaging</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <Input placeholder="From (you)" value={fromUser} onChange={(e) => setFromUser(e.target.value)} />
              <Input placeholder="To" value={toUser} onChange={(e) => setToUser(e.target.value)} />
            </div>
            <Textarea placeholder="Message" value={msgText} onChange={(e) => setMsgText(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={sendMessage}>Send</Button>
              <Button variant="outline" onClick={fetchMessages}>Fetch</Button>
            </div>
            <div className="text-sm text-slate-200 space-y-1">
              {messages.map((m, i) => <div key={i}>{m}</div>)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle>News</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input value={newsTopic} onChange={(e) => setNewsTopic(e.target.value)} />
              <Button onClick={loadNews}>Refresh</Button>
            </div>
            <div className="space-y-2 text-sm text-slate-200">
              {news.map((n, i) => (
                <div key={i} className="border border-slate-800 p-2 rounded">
                  <div className="font-semibold">{n.title}</div>
                  <div className="text-xs text-slate-400">{n.source} — {new Date(n.publishedAt).toLocaleString()}</div>
                  <div>{n.summary}</div>
                  <a className="text-blue-400 text-xs" href={n.url} target="_blank" rel="noreferrer">Source</a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle>Reminders</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Reminder text" value={reminderText} onChange={(e) => setReminderText(e.target.value)} />
            <Input placeholder="Timestamp (ms)" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
            <Button onClick={createReminder}>Create Reminder</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

