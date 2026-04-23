import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  ArrowLeft,
  Mouse,
  Keyboard,
  Clipboard,
  Send,
  Play,
  Pause,
  Trash2,
  History,
  Terminal,
  Cpu,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  MonitorSmartphone,
  Command,
  Pointer,
  Type,
  Copy,
  Sparkles,
  Zap,
  Settings,
  Bot,
  Brain,
  MessageSquare,
  Gauge,
  Eye,
  Hand,
  Workflow
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PointerAction {
  id: string;
  type: string;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  status: string;
  duration?: number;
}

interface KeyboardAction {
  id: string;
  type: string;
  text?: string;
  key?: string;
  keys?: string[];
  status: string;
  duration?: number;
}

interface ClipboardAction {
  id: string;
  type: string;
  content?: string;
  result?: string;
  status: string;
}

interface DeviceCommand {
  id: string;
  naturalLanguage: string;
  parsedActions: (PointerAction | KeyboardAction | ClipboardAction)[];
  intent: string;
  confidence: number;
  timestamp: number;
  status: string;
  executionTime?: number;
  error?: string;
}

interface DeviceState {
  pointer: { x: number; y: number; isPressed: boolean; button: string | null };
  keyboard: { activeModifiers: string[]; lastKey: string | null; capsLock: boolean };
  clipboard: { currentContent: string | null; format: string | null };
  screen: { width: number; height: number; activeWindow: string | null };
}

interface AgentFeedback {
  type: "info" | "action" | "success" | "warning" | "error" | "thinking";
  message: string;
  timestamp: number;
  taskId?: string;
  stepId?: string;
  progress?: number;
}

interface AgentStep {
  id: string;
  action: string;
  target?: string;
  status: string;
  feedback: string;
  duration?: number;
  timestamp?: number;
}

interface AgentTask {
  id: string;
  description: string;
  steps: AgentStep[];
  status: string;
  startTime: number;
  endTime?: number;
  result?: string;
  error?: string;
}

interface AgentStatus {
  isExecuting: boolean;
  currentTask: AgentTask | null;
  tasksCompleted: number;
  tasksFailed: number;
  behaviorConfig: {
    pointerSpeed: string;
    typingSpeed: string;
    pauseBetweenActions: boolean;
    naturalErrors: boolean;
    thinkingPauses: boolean;
  };
}

export default function AIAssistant() {
  const { toast } = useToast();
  const [commandInput, setCommandInput] = useState("");
  const [agentInput, setAgentInput] = useState("");
  const [activeTab, setActiveTab] = useState("agent");
  const [agentFeedback, setAgentFeedback] = useState<AgentFeedback[]>([]);
  const [isAgentMode, setIsAgentMode] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const agentInputRef = useRef<HTMLInputElement>(null);
  const feedbackEndRef = useRef<HTMLDivElement>(null);

  const { data: deviceState, refetch: refetchState } = useQuery<DeviceState>({
    queryKey: ["/api/cyrus/device/state"],
    refetchInterval: 1000
  });

  const { data: commandHistory } = useQuery<DeviceCommand[]>({
    queryKey: ["/api/cyrus/device/history"],
    refetchInterval: 2000
  });

  const { data: actionQueue } = useQuery<DeviceCommand[]>({
    queryKey: ["/api/cyrus/device/queue"]
  });

  const { data: clipboardHistory } = useQuery<any[]>({
    queryKey: ["/api/cyrus/device/clipboard/history"]
  });

  const { data: supportedCommands } = useQuery<string[]>({
    queryKey: ["/api/cyrus/device/commands"]
  });

  const { data: agentStatus, refetch: refetchAgentStatus } = useQuery<AgentStatus>({
    queryKey: ["/api/cyrus/agent/status"],
    refetchInterval: 1000
  });

  const { data: agentHistory } = useQuery<AgentTask[]>({
    queryKey: ["/api/cyrus/agent/history"],
    refetchInterval: 3000
  });

  const agentExecuteMutation = useMutation({
    mutationFn: async (command: string) => {
      const res = await apiRequest("POST", "/api/cyrus/agent/execute", { command });
      return res.json();
    },
    onSuccess: (data: AgentTask) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cyrus/agent/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cyrus/agent/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cyrus/device/state"] });
      setAgentInput("");
      
      const taskFeedback = data.steps.map(step => ({
        type: step.status === "completed" ? "success" as const : step.status === "failed" ? "error" as const : "action" as const,
        message: step.feedback,
        timestamp: step.timestamp || Date.now(),
        stepId: step.id
      }));
      setAgentFeedback(prev => [...prev, ...taskFeedback].slice(-50));
      
      if (data.status === "completed") {
        toast({ title: "Task Completed", description: data.description });
      } else if (data.status === "failed") {
        toast({ title: "Task Failed", description: data.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Agent Error", description: error.message, variant: "destructive" });
    }
  });

  const updateAgentConfigMutation = useMutation({
    mutationFn: async (config: Partial<AgentStatus["behaviorConfig"]>) => {
      const res = await apiRequest("POST", "/api/cyrus/agent/config", config);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cyrus/agent/status"] });
      toast({ title: "Agent Config Updated" });
    }
  });

  useEffect(() => {
    if (feedbackEndRef.current) {
      feedbackEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [agentFeedback]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    
    const connectStream = () => {
      eventSource = new EventSource("/api/cyrus/agent/stream");
      
      eventSource.onmessage = (event) => {
        try {
          const feedback = JSON.parse(event.data);
          if (feedback.type !== "connected") {
            setAgentFeedback(prev => [...prev, feedback].slice(-50));
          }
        } catch (e) {
          console.error("Failed to parse feedback:", e);
        }
      };
      
      eventSource.onerror = () => {
        eventSource?.close();
        setTimeout(connectStream, 5000);
      };
    };
    
    connectStream();
    
    return () => {
      eventSource?.close();
    };
  }, []);

  const handleAgentExecute = () => {
    if (agentInput.trim() && !agentStatus?.isExecuting) {
      setAgentFeedback(prev => [...prev, {
        type: "info",
        message: `Processing: "${agentInput}"`,
        timestamp: Date.now()
      }]);
      agentExecuteMutation.mutate(agentInput.trim());
    }
  };

  const handleAgentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAgentExecute();
    }
  };

  const getFeedbackIcon = (type: AgentFeedback["type"]) => {
    switch (type) {
      case "success": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error": return <XCircle className="w-4 h-4 text-red-500" />;
      case "warning": return <Activity className="w-4 h-4 text-yellow-500" />;
      case "thinking": return <Brain className="w-4 h-4 text-purple-500 animate-pulse" />;
      case "action": return <Hand className="w-4 h-4 text-blue-500" />;
      default: return <MessageSquare className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const executeMutation = useMutation({
    mutationFn: async (command: string) => {
      const res = await apiRequest("POST", "/api/cyrus/device/execute", { command });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cyrus/device/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cyrus/device/state"] });
      setCommandInput("");
      if (data.status === "completed") {
        toast({ title: "Command Executed", description: `${data.intent} completed successfully` });
      } else if (data.status === "failed") {
        toast({ title: "Command Failed", description: data.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Execution Error", description: error.message, variant: "destructive" });
    }
  });

  const queueMutation = useMutation({
    mutationFn: async (command: string) => {
      const res = await apiRequest("POST", "/api/cyrus/device/queue", { command });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cyrus/device/queue"] });
      setCommandInput("");
      toast({ title: "Command Queued", description: "Added to execution queue" });
    }
  });

  const processQueueMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cyrus/device/process-queue");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cyrus/device/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cyrus/device/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cyrus/device/state"] });
      toast({ title: "Queue Processed", description: "All queued commands executed" });
    }
  });

  const clearQueueMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cyrus/device/clear-queue");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cyrus/device/queue"] });
      toast({ title: "Queue Cleared" });
    }
  });

  const setClipboardMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/cyrus/device/clipboard", { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cyrus/device/clipboard/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cyrus/device/state"] });
      toast({ title: "Clipboard Updated" });
    }
  });

  const handleExecute = () => {
    if (commandInput.trim()) {
      executeMutation.mutate(commandInput.trim());
    }
  };

  const handleQueue = () => {
    if (commandInput.trim()) {
      queueMutation.mutate(commandInput.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleExecute();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "executing":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "queued":
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      failed: "destructive",
      executing: "secondary",
      queued: "outline",
      pending: "outline"
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                CYRUS AI Assistant
              </h1>
              <p className="text-sm text-muted-foreground">
                Intelligent Device Control Interface
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <MonitorSmartphone className="w-3 h-3" />
              {deviceState?.screen.width}x{deviceState?.screen.height}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Activity className="w-3 h-3" />
              {deviceState?.screen.activeWindow || "Desktop"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card data-testid="card-pointer-state">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Pointer className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pointer</p>
                  <p className="font-mono text-lg">
                    {deviceState?.pointer.x}, {deviceState?.pointer.y}
                  </p>
                </div>
                {deviceState?.pointer.isPressed && (
                  <Badge variant="default" className="ml-auto">Pressed</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-keyboard-state">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Keyboard className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Key</p>
                  <p className="font-mono text-lg">
                    {deviceState?.keyboard.lastKey || "—"}
                  </p>
                </div>
                <div className="ml-auto flex gap-1">
                  {deviceState?.keyboard.activeModifiers?.map((mod) => (
                    <Badge key={mod} variant="outline" className="text-xs">{mod}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-clipboard-state">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Clipboard className="w-5 h-5 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Clipboard</p>
                  <p className="font-mono text-sm truncate">
                    {deviceState?.clipboard.currentContent?.substring(0, 20) || "Empty"}
                    {(deviceState?.clipboard.currentContent?.length || 0) > 20 && "..."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-queue-status">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Command className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Queue</p>
                  <p className="font-mono text-lg">
                    {actionQueue?.length || 0} pending
                  </p>
                </div>
                {(actionQueue?.length || 0) > 0 && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="ml-auto"
                    onClick={() => processQueueMutation.mutate()}
                    disabled={processQueueMutation.isPending}
                    data-testid="button-process-queue"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Run
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-command-input">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Command Interface
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter natural language command... (e.g., 'click at 500, 300' or 'type Hello World')"
                className="flex-1 font-mono"
                data-testid="input-command"
              />
              <Button
                onClick={handleExecute}
                disabled={!commandInput.trim() || executeMutation.isPending}
                data-testid="button-execute"
              >
                {executeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                <span className="ml-2">Execute</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleQueue}
                disabled={!commandInput.trim()}
                data-testid="button-queue"
              >
                <Clock className="w-4 h-4 mr-2" />
                Queue
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">Quick commands:</span>
              {["click at 500, 300", "type 'Hello'", "press enter", "copy", "paste", "scroll down 200"].map((cmd) => (
                <Badge
                  key={cmd}
                  variant="outline"
                  className="cursor-pointer hover-elevate"
                  onClick={() => setCommandInput(cmd)}
                  data-testid={`badge-quick-command-${cmd.split(" ")[0]}`}
                >
                  {cmd}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="agent" data-testid="tab-agent">
              <Bot className="w-4 h-4 mr-2" />
              AI Agent
            </TabsTrigger>
            <TabsTrigger value="command" data-testid="tab-command">
              <Terminal className="w-4 h-4 mr-2" />
              Commands
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="clipboard" data-testid="tab-clipboard">
              <Clipboard className="w-4 h-4 mr-2" />
              Clipboard
            </TabsTrigger>
            <TabsTrigger value="help" data-testid="tab-help">
              <Settings className="w-4 h-4 mr-2" />
              Help
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agent" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <Card data-testid="card-agent-input">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-primary" />
                      Autonomous AI Agent
                      {agentStatus?.isExecuting && (
                        <Badge variant="secondary" className="ml-auto gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Executing
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        ref={agentInputRef}
                        value={agentInput}
                        onChange={(e) => setAgentInput(e.target.value)}
                        onKeyDown={handleAgentKeyDown}
                        placeholder="Tell me what to do... (e.g., 'Search for weather on Google' or 'Open the browser and navigate to github.com')"
                        className="flex-1"
                        disabled={agentStatus?.isExecuting}
                        data-testid="input-agent-command"
                      />
                      <Button
                        onClick={handleAgentExecute}
                        disabled={!agentInput.trim() || agentStatus?.isExecuting || agentExecuteMutation.isPending}
                        data-testid="button-agent-execute"
                      >
                        {agentExecuteMutation.isPending || agentStatus?.isExecuting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Brain className="w-4 h-4" />
                        )}
                        <span className="ml-2">Execute</span>
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-muted-foreground">Try:</span>
                      {[
                        "Open the browser",
                        "Search for 'AI news' on Google",
                        "Navigate to github.com",
                        "Click the search button",
                        "Type 'Hello World' into the input",
                        "Scroll down 5 times",
                        "Take a screenshot"
                      ].map((cmd) => (
                        <Badge
                          key={cmd}
                          variant="outline"
                          className="cursor-pointer hover-elevate text-xs"
                          onClick={() => setAgentInput(cmd)}
                          data-testid={`badge-agent-example-${cmd.split(" ")[0]}`}
                        >
                          {cmd}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-agent-feedback">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Real-time Feedback
                      <Badge variant="outline" className="ml-auto">
                        {agentFeedback.length} messages
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-80 rounded-lg border bg-muted/30 p-3">
                      {agentFeedback.length > 0 ? (
                        <div className="space-y-2">
                          {agentFeedback.map((fb, idx) => (
                            <div
                              key={idx}
                              className={`flex items-start gap-2 p-2 rounded-lg ${
                                fb.type === "success" ? "bg-green-500/10" :
                                fb.type === "error" ? "bg-red-500/10" :
                                fb.type === "thinking" ? "bg-purple-500/10" :
                                fb.type === "action" ? "bg-blue-500/10" :
                                "bg-muted/50"
                              }`}
                              data-testid={`feedback-item-${idx}`}
                            >
                              {getFeedbackIcon(fb.type)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm">{fb.message}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(fb.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                              {fb.progress !== undefined && (
                                <Badge variant="outline" className="text-xs">
                                  {fb.progress}%
                                </Badge>
                              )}
                            </div>
                          ))}
                          <div ref={feedbackEndRef} />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                          <Eye className="w-8 h-8 mb-2 opacity-50" />
                          <p className="text-sm">Waiting for agent activity...</p>
                          <p className="text-xs">Enter a command to see real-time feedback</p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card data-testid="card-agent-status">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Gauge className="w-4 h-4" />
                      Agent Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-green-500/10 text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {agentStatus?.tasksCompleted || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                      <div className="p-3 rounded-lg bg-red-500/10 text-center">
                        <p className="text-2xl font-bold text-red-600">
                          {agentStatus?.tasksFailed || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Failed</p>
                      </div>
                    </div>

                    {agentStatus?.currentTask && (
                      <div className="p-3 rounded-lg border">
                        <p className="text-sm font-medium mb-2">Current Task</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {agentStatus.currentTask.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Progress 
                            value={
                              (agentStatus.currentTask.steps.filter(s => s.status === "completed").length / 
                               agentStatus.currentTask.steps.length) * 100
                            } 
                            className="flex-1"
                          />
                          <span className="text-xs text-muted-foreground">
                            {agentStatus.currentTask.steps.filter(s => s.status === "completed").length}/
                            {agentStatus.currentTask.steps.length}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card data-testid="card-agent-config">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Behavior Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="pointer-speed" className="text-sm">Pointer Speed</Label>
                        <Select
                          value={agentStatus?.behaviorConfig?.pointerSpeed || "normal"}
                          onValueChange={(value) => updateAgentConfigMutation.mutate({ pointerSpeed: value as any })}
                        >
                          <SelectTrigger className="w-24" id="pointer-speed" data-testid="select-pointer-speed">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="slow">Slow</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="fast">Fast</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="typing-speed" className="text-sm">Typing Speed</Label>
                        <Select
                          value={agentStatus?.behaviorConfig?.typingSpeed || "normal"}
                          onValueChange={(value) => updateAgentConfigMutation.mutate({ typingSpeed: value as any })}
                        >
                          <SelectTrigger className="w-24" id="typing-speed" data-testid="select-typing-speed">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="slow">Slow</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="fast">Fast</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="thinking-pauses" className="text-sm">Thinking Pauses</Label>
                        <Switch
                          id="thinking-pauses"
                          checked={agentStatus?.behaviorConfig?.thinkingPauses ?? true}
                          onCheckedChange={(checked) => updateAgentConfigMutation.mutate({ thinkingPauses: checked })}
                          data-testid="switch-thinking-pauses"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="action-pauses" className="text-sm">Action Pauses</Label>
                        <Switch
                          id="action-pauses"
                          checked={agentStatus?.behaviorConfig?.pauseBetweenActions ?? true}
                          onCheckedChange={(checked) => updateAgentConfigMutation.mutate({ pauseBetweenActions: checked })}
                          data-testid="switch-action-pauses"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-agent-history">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Workflow className="w-4 h-4" />
                      Recent Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      {agentHistory && agentHistory.length > 0 ? (
                        <div className="space-y-2">
                          {agentHistory.slice(0, 10).map((task) => (
                            <div
                              key={task.id}
                              className="p-2 rounded-lg border text-sm"
                              data-testid={`history-task-${task.id}`}
                            >
                              <div className="flex items-center gap-2">
                                {task.status === "completed" ? (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-red-500" />
                                )}
                                <span className="truncate flex-1">{task.description}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {task.steps.length} steps • {task.endTime ? ((task.endTime - task.startTime) / 1000).toFixed(1) : "—"}s
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-4">
                          <History className="w-6 h-6 mb-2 opacity-50" />
                          <p className="text-xs">No tasks yet</p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="command" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card data-testid="card-action-queue">
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-base">Action Queue</CardTitle>
                  {(actionQueue?.length || 0) > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => clearQueueMutation.mutate()}
                      data-testid="button-clear-queue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {actionQueue && actionQueue.length > 0 ? (
                      <div className="space-y-2">
                        {actionQueue.map((cmd, idx) => (
                          <div 
                            key={cmd.id} 
                            className="p-3 rounded-lg bg-muted/50 space-y-2"
                            data-testid={`queue-item-${idx}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-sm">{cmd.naturalLanguage}</span>
                              {getStatusBadge(cmd.status)}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{cmd.parsedActions.length} actions</span>
                              <span>•</span>
                              <span>{cmd.intent}</span>
                              <span>•</span>
                              <span>{(cmd.confidence * 100).toFixed(0)}% confidence</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Command className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">No commands in queue</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card data-testid="card-recent-executions">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recent Executions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {commandHistory && commandHistory.length > 0 ? (
                      <div className="space-y-2">
                        {commandHistory.slice(0, 10).map((cmd) => (
                          <div 
                            key={cmd.id} 
                            className="p-3 rounded-lg bg-muted/50 space-y-2"
                            data-testid={`history-item-${cmd.id}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(cmd.status)}
                                <span className="font-mono text-sm truncate">{cmd.naturalLanguage}</span>
                              </div>
                              {getStatusBadge(cmd.status)}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{cmd.parsedActions.length} actions</span>
                              {cmd.executionTime && (
                                <>
                                  <span>•</span>
                                  <span>{cmd.executionTime}ms</span>
                                </>
                              )}
                              {cmd.error && (
                                <>
                                  <span>•</span>
                                  <span className="text-red-500">{cmd.error}</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <History className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">No execution history</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card data-testid="card-full-history">
              <CardHeader>
                <CardTitle>Command History</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {commandHistory && commandHistory.length > 0 ? (
                    <div className="space-y-3">
                      {commandHistory.map((cmd) => (
                        <div 
                          key={cmd.id} 
                          className="p-4 rounded-lg border space-y-3"
                          data-testid={`full-history-item-${cmd.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(cmd.status)}
                              <span className="font-medium">{cmd.naturalLanguage}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{cmd.intent}</Badge>
                              {getStatusBadge(cmd.status)}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Confidence</span>
                              <Progress value={cmd.confidence * 100} className="mt-1" />
                              <span className="text-xs">{(cmd.confidence * 100).toFixed(0)}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Actions</span>
                              <p className="font-mono">{cmd.parsedActions.length}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Execution Time</span>
                              <p className="font-mono">{cmd.executionTime || 0}ms</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Timestamp</span>
                              <p className="font-mono text-xs">
                                {new Date(cmd.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>

                          {cmd.parsedActions.length > 0 && (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground mb-2">Parsed Actions:</p>
                              <div className="flex flex-wrap gap-2">
                                {cmd.parsedActions.map((action, idx) => (
                                  <Badge key={idx} variant="secondary" className="font-mono text-xs">
                                    {action.type}
                                    {"x" in action && ` (${action.x}, ${action.y})`}
                                    {"text" in action && action.text && ` "${action.text.substring(0, 15)}..."`}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <History className="w-12 h-12 mb-4 opacity-50" />
                      <p>No commands executed yet</p>
                      <p className="text-sm">Use the command interface above to get started</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clipboard" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card data-testid="card-clipboard-current">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clipboard className="w-5 h-5" />
                    Current Clipboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50 min-h-24">
                    <p className="font-mono text-sm whitespace-pre-wrap">
                      {deviceState?.clipboard.currentContent || "Clipboard is empty"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Set clipboard content..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setClipboardMutation.mutate((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                      data-testid="input-set-clipboard"
                    />
                    <Button 
                      variant="outline"
                      onClick={() => {
                        const input = document.querySelector('[data-testid="input-set-clipboard"]') as HTMLInputElement;
                        if (input?.value) {
                          setClipboardMutation.mutate(input.value);
                          input.value = "";
                        }
                      }}
                      data-testid="button-set-clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-clipboard-history">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Clipboard History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {clipboardHistory && clipboardHistory.length > 0 ? (
                      <div className="space-y-2">
                        {clipboardHistory.map((entry, idx) => (
                          <div 
                            key={entry.id || idx}
                            className="p-3 rounded-lg bg-muted/50 cursor-pointer hover-elevate"
                            onClick={() => setClipboardMutation.mutate(entry.content)}
                            data-testid={`clipboard-history-item-${idx}`}
                          >
                            <p className="font-mono text-sm truncate">{entry.content}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">{entry.format}</Badge>
                              <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Clipboard className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">No clipboard history</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="help" className="space-y-4">
            <Card data-testid="card-supported-commands">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Command className="w-5 h-5" />
                  Supported Commands
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-medium flex items-center gap-2">
                      <Pointer className="w-4 h-4 text-blue-500" />
                      Pointer Control
                    </h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li><code className="bg-muted px-1 rounded">click at (x, y)</code></li>
                      <li><code className="bg-muted px-1 rounded">double-click at (x, y)</code></li>
                      <li><code className="bg-muted px-1 rounded">right-click at (x, y)</code></li>
                      <li><code className="bg-muted px-1 rounded">drag from (x1, y1) to (x2, y2)</code></li>
                      <li><code className="bg-muted px-1 rounded">scroll up/down [amount]</code></li>
                      <li><code className="bg-muted px-1 rounded">move to (x, y)</code></li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium flex items-center gap-2">
                      <Type className="w-4 h-4 text-green-500" />
                      Keyboard Control
                    </h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li><code className="bg-muted px-1 rounded">type "text"</code></li>
                      <li><code className="bg-muted px-1 rounded">press enter/tab/escape</code></li>
                      <li><code className="bg-muted px-1 rounded">hotkey ctrl+c</code></li>
                      <li><code className="bg-muted px-1 rounded">search "term"</code></li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium flex items-center gap-2">
                      <Clipboard className="w-4 h-4 text-purple-500" />
                      Clipboard Control
                    </h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li><code className="bg-muted px-1 rounded">copy</code></li>
                      <li><code className="bg-muted px-1 rounded">paste</code></li>
                      <li><code className="bg-muted px-1 rounded">cut</code></li>
                      <li><code className="bg-muted px-1 rounded">clear clipboard</code></li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-lg bg-muted/50">
                  <h3 className="font-medium mb-2">Command Chaining</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Chain multiple commands using <code className="bg-muted px-1 rounded">then</code>, 
                    <code className="bg-muted px-1 rounded">and</code>, or commas:
                  </p>
                  <code className="text-sm bg-muted p-2 rounded block">
                    click at 500, 300 then type "Hello World" and press enter
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
