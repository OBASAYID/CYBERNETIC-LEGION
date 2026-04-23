import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Loader2, Minimize2, Target, FileText, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  mode?: "chat" | "analytic";
  analysis?: {
    type: string;
    confidence: number;
  };
  analyticData?: {
    summary?: string;
    facts?: string[];
    risks?: string[];
    recommendation?: string;
  };
}

interface AIAssistantPanelProps {
  minimized: boolean;
  onToggleMinimize: () => void;
  selectedDroneName?: string;
}

const CYRUS_API_URL = "/api/cyrus";

export function AIAssistantPanel({ minimized, onToggleMinimize, selectedDroneName }: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Welcome, Operator. I'm CYRUS, your GPT-5 powered tactical AI assistant.\n\nCapabilities:\n• Chat Mode - Real-time operational support\n• Analytic Mode - Structured tactical analysis\n• Mission Planning - AI-assisted route optimization\n\nHow can I assist you today?",
      timestamp: new Date(),
      mode: "chat",
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "checking">("checking");
  const [activeMode, setActiveMode] = useState<"chat" | "analytic">("chat");
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const checkConnection = async () => {
    // Mock connection check
    await new Promise(resolve => setTimeout(resolve, 500));
    setConnectionStatus("connected");
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
      mode: activeMode,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (activeMode === "analytic") {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Based on the telemetry data, all systems are operating within nominal parameters. No anomalies detected in the current flight sector.",
          timestamp: new Date(),
          mode: "analytic",
          analysis: {
            type: "ANALYTIC",
            confidence: 0.98,
          },
          analyticData: {
            summary: "Systems nominal. Flight path clear.",
            facts: ["Battery at 87%", "GPS Signal Strong (12 satellites)", "Wind speed 4.2 m/s"],
            risks: ["Approaching no-fly zone boundary (2km away)"],
            recommendation: "Maintain current heading. Monitor battery levels.",
          },
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I've processed your request. Proceeding with standard operating procedures. Is there anything specific you need me to monitor?",
          timestamp: new Date(),
          mode: "chat",
          analysis: {
            type: "CHAT",
            confidence: 0.95,
          },
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
      
      setConnectionStatus("connected");
    } catch (error) {
      // Fallback
      setConnectionStatus("disconnected");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const quickActions = activeMode === "chat" ? [
    { label: "Commands", query: "What commands are available?" },
    { label: "Fleet Status", query: "Give me a fleet status summary" },
    { label: "Plan Mission", query: "Help me plan a reconnaissance mission" },
  ] : [
    { label: "Risk Assessment", query: "Analyze current fleet risks and threats" },
    { label: "Mission Analysis", query: "Evaluate mission readiness for all active drones" },
    { label: "Tactical Review", query: "Provide tactical assessment of current operations" },
  ];

  if (minimized) {
    return (
      <Card 
        className="fixed bottom-4 right-4 w-14 h-14 flex items-center justify-center cursor-pointer hover-elevate z-50"
        onClick={onToggleMinimize}
        data-testid="ai-assistant-minimized"
      >
        <div className="relative">
          <Sparkles className="h-6 w-6 text-primary" />
          {connectionStatus === "connected" && (
            <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-status-online" />
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-[420px] h-[550px] flex flex-col shadow-xl z-50" data-testid="ai-assistant-panel">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">CYRUS AI</h3>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[9px] px-1.5 py-0 h-4",
                  connectionStatus === "connected" ? "text-status-online border-status-online/30" : "text-status-offline border-status-offline/30"
                )}
              >
                {connectionStatus === "connected" ? "GPT-5" : connectionStatus === "checking" ? "..." : "OFFLINE"}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">Tactical Operations Assistant</p>
          </div>
        </div>
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-7 w-7"
          onClick={onToggleMinimize}
          data-testid="button-minimize-ai"
        >
          <Minimize2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3 py-2 border-b border-border">
        <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as "chat" | "analytic")}>
          <TabsList className="w-full h-8">
            <TabsTrigger value="chat" className="flex-1 text-xs gap-1" data-testid="tab-chat">
              <Bot className="h-3 w-3" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="analytic" className="flex-1 text-xs gap-1" data-testid="tab-analytic">
              <Target className="h-3 w-3" />
              Analytic
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-3" data-testid="ai-messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-2",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  message.mode === "analytic" ? "bg-amber-500/20" : "bg-primary/20"
                )}>
                  {message.mode === "analytic" ? (
                    <Target className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-xs",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : message.mode === "analytic" 
                      ? "bg-amber-500/10 border border-amber-500/20"
                      : "bg-muted"
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                
                {message.analyticData && (
                  <div className="mt-2 space-y-2">
                    {message.analyticData.facts && message.analyticData.facts.length > 0 && (
                      <div className="pt-2 border-t border-border/50">
                        <span className="text-[9px] font-semibold text-amber-500">FACTS:</span>
                        <ul className="mt-1 text-[10px] space-y-0.5">
                          {message.analyticData.facts.slice(0, 3).map((fact, i) => (
                            <li key={i}>• {fact}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {message.analyticData.risks && message.analyticData.risks.length > 0 && (
                      <div>
                        <span className="text-[9px] font-semibold text-red-500">RISKS:</span>
                        <ul className="mt-1 text-[10px] space-y-0.5">
                          {message.analyticData.risks.slice(0, 2).map((risk, i) => (
                            <li key={i}>• {risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {message.analyticData.recommendation && (
                      <div className="pt-1">
                        <span className="text-[9px] font-semibold text-green-500">RECOMMENDATION:</span>
                        <p className="mt-0.5 text-[10px]">{message.analyticData.recommendation}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {message.analysis && (
                  <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-2">
                    <Badge variant="outline" className={cn(
                      "text-[9px] px-1 py-0 h-4",
                      message.mode === "analytic" ? "border-amber-500/30 text-amber-500" : ""
                    )}>
                      {message.analysis.type.replace("_", " ")}
                    </Badge>
                    <span className="text-[9px] text-muted-foreground">
                      {Math.round(message.analysis.confidence * 100)}% confidence
                    </span>
                  </div>
                )}
              </div>
              {message.role === "user" && (
                <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
                activeMode === "analytic" ? "bg-amber-500/20" : "bg-primary/20"
              )}>
                {activeMode === "analytic" ? (
                  <Target className="h-3.5 w-3.5 text-amber-500" />
                ) : (
                  <Bot className="h-3.5 w-3.5 text-primary" />
                )}
              </div>
              <div className={cn(
                "rounded-lg px-3 py-2",
                activeMode === "analytic" ? "bg-amber-500/10" : "bg-muted"
              )}>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {activeMode === "analytic" ? "Analyzing..." : "Processing..."}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="px-3 py-2 border-t border-border">
        <div className="flex gap-1 mb-2 flex-wrap">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className={cn(
                "h-6 text-[10px] px-2",
                activeMode === "analytic" ? "border-amber-500/30 hover:bg-amber-500/10" : ""
              )}
              onClick={() => {
                setInputValue(action.query);
                inputRef.current?.focus();
              }}
              data-testid={`button-quick-${action.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              {action.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant={isRecording ? "destructive" : "outline"}
            className="h-8 w-8 shrink-0"
            onClick={toggleRecording}
            data-testid="button-voice-toggle"
          >
            {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          </Button>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeMode === "analytic" ? "Enter analysis query..." : "Ask about drone operations..."}
            className="text-xs h-8"
            disabled={isLoading}
            data-testid="input-ai-message"
          />
          <Button 
            size="icon" 
            className={cn(
              "h-8 w-8 shrink-0",
              activeMode === "analytic" ? "bg-amber-500 hover:bg-amber-600" : ""
            )}
            onClick={sendMessage}
            disabled={isLoading || !inputValue.trim()}
            data-testid="button-send-message"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
