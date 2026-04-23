import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Palette, 
  Play, 
  RefreshCw,
  Layers,
  Wand2,
  Image,
  Video,
  FileImage,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Box,
  Pencil,
  Monitor,
  Settings2
} from "lucide-react";

interface SoftwareCapabilities {
  software: string;
  name: string;
  version: string;
  supportedFormats: string[];
  availableTools: string[];
  isInstalled: boolean;
  isRunning: boolean;
}

interface DesignTask {
  id: string;
  name: string;
  description: string;
  software: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  progress: number;
  createdAt: number;
  completedAt?: number;
  output?: {
    filePath: string;
    format: string;
  };
  error?: string;
}

interface DesignTemplate {
  id: string;
  name: string;
  category: string;
  software: string[];
}

interface DesignStatus {
  enabled: boolean;
  isProcessing: boolean;
  queueLength: number;
  completedTasks: number;
  failedTasks: number;
  availableSoftware: number;
}

const softwareIcons: Record<string, any> = {
  photoshop: Image,
  illustrator: Pencil,
  figma: Layers,
  blender: Box,
  after_effects: Video,
  premiere_pro: Video,
  canva: Palette
};

export default function DesignAutomation() {
  const { toast } = useToast();
  const [designInput, setDesignInput] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading } = useQuery<DesignStatus>({
    queryKey: ["/api/design/status"],
    refetchInterval: 2000
  });

  const { data: software = [] } = useQuery<SoftwareCapabilities[]>({
    queryKey: ["/api/design/software"]
  });

  const { data: templates = [] } = useQuery<DesignTemplate[]>({
    queryKey: ["/api/design/templates"]
  });

  const { data: tasks = [] } = useQuery<DesignTask[]>({
    queryKey: ["/api/design/tasks"],
    refetchInterval: 2000
  });

  const executeMutation = useMutation({
    mutationFn: (params: { input?: string; templateId?: string }) => 
      apiRequest("POST", "/api/design/execute", params),
    onSuccess: (data: any) => {
      if (data.error) {
        toast({ title: "Task Failed", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "Task Completed", description: data.name });
        queryClient.invalidateQueries({ queryKey: ["/api/design/tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/design/status"] });
        setDesignInput("");
        setSelectedTemplate(null);
      }
    }
  });

  const queueMutation = useMutation({
    mutationFn: (input: string) => apiRequest("POST", "/api/design/queue", { input }),
    onSuccess: (data: any) => {
      toast({ title: "Task Queued", description: `Task ID: ${data.taskId}` });
      queryClient.invalidateQueries({ queryKey: ["/api/design/tasks"] });
      setDesignInput("");
    }
  });

  const handleExecute = () => {
    if (selectedTemplate) {
      executeMutation.mutate({ templateId: selectedTemplate });
    } else if (designInput.trim()) {
      executeMutation.mutate({ input: designInput });
    } else {
      toast({ title: "Enter a design task or select a template", variant: "destructive" });
    }
  };

  const handleQueue = () => {
    if (designInput.trim()) {
      queueMutation.mutate(designInput);
    } else {
      toast({ title: "Enter a design task", variant: "destructive" });
    }
  };

  const getStatusIcon = (taskStatus: string) => {
    switch (taskStatus) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "in_progress":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "social":
        return <Image className="h-5 w-5" />;
      case "video":
        return <Video className="h-5 w-5" />;
      case "branding":
        return <Palette className="h-5 w-5" />;
      case "animation":
        return <Sparkles className="h-5 w-5" />;
      default:
        return <FileImage className="h-5 w-5" />;
    }
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6" data-testid="design-automation">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Design Automation</h1>
            <p className="text-muted-foreground">AI-powered creative software operation</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={status?.isProcessing ? "default" : "secondary"} className="px-3 py-1">
              {status?.isProcessing ? (
                <><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Processing</>
              ) : (
                <><CheckCircle2 className="h-3 w-3 mr-1" /> Ready</>
              )}
            </Badge>
            {status?.queueLength ? (
              <Badge variant="outline" className="px-3 py-1">
                Queue: {status.queueLength}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Software</p>
                  <p className="text-2xl font-bold">{status?.availableSoftware || 0}</p>
                </div>
                <Monitor className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed Tasks</p>
                  <p className="text-2xl font-bold text-green-500">{status?.completedTasks || 0}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed Tasks</p>
                  <p className="text-2xl font-bold text-red-500">{status?.failedTasks || 0}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Queue Length</p>
                  <p className="text-2xl font-bold">{status?.queueLength || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Create Design Task
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Describe your design task</Label>
                  <Textarea
                    value={designInput}
                    onChange={(e) => {
                      setDesignInput(e.target.value);
                      setSelectedTemplate(null);
                    }}
                    placeholder="e.g., Create a YouTube thumbnail with bold text and gradient background for a tech review video"
                    className="min-h-[100px]"
                    data-testid="textarea-design-input"
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleExecute}
                    disabled={executeMutation.isPending || (!designInput.trim() && !selectedTemplate)}
                    className="flex-1"
                    data-testid="button-execute-design"
                  >
                    {executeMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Execute Now
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleQueue}
                    disabled={queueMutation.isPending || !designInput.trim()}
                    data-testid="button-queue-design"
                  >
                    Add to Queue
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors hover-elevate ${
                        selectedTemplate === template.id ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => {
                        setSelectedTemplate(template.id);
                        setDesignInput("");
                      }}
                      data-testid={`template-${template.id}`}
                    >
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(template.category)}
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{template.category}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {template.software.slice(0, 3).map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs capitalize">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {tasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Task History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tasks.slice(-10).reverse().map((task) => (
                      <div 
                        key={task.id} 
                        className="p-3 border rounded-lg"
                        data-testid={`task-${task.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(task.status)}
                            <span className="font-medium">{task.name}</span>
                          </div>
                          <Badge variant="secondary" className="capitalize text-xs">
                            {task.software}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                        {task.status === "in_progress" && (
                          <Progress value={task.progress} className="h-2" />
                        )}
                        {task.error && (
                          <p className="text-sm text-red-500 mt-1">{task.error}</p>
                        )}
                        {task.output && (
                          <p className="text-sm text-green-500 mt-1">Output: {task.output.filePath}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Available Software
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {software.map((s) => {
                    const IconComponent = softwareIcons[s.software] || Settings2;
                    return (
                      <div 
                        key={s.software} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                        data-testid={`software-${s.software}`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-xs text-muted-foreground">v{s.version}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {s.isRunning ? (
                            <Badge className="bg-green-500">Running</Badge>
                          ) : s.isInstalled ? (
                            <Badge variant="secondary">Installed</Badge>
                          ) : (
                            <Badge variant="outline">Not Installed</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setDesignInput("Create a social media post for Instagram with modern design")}
                  data-testid="button-quick-social"
                >
                  <Image className="h-4 w-4 mr-2" />
                  Social Media Post
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setDesignInput("Design a YouTube thumbnail with bold typography")}
                  data-testid="button-quick-thumbnail"
                >
                  <Video className="h-4 w-4 mr-2" />
                  YouTube Thumbnail
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setDesignInput("Create a modern logo with clean lines and minimal colors")}
                  data-testid="button-quick-logo"
                >
                  <Palette className="h-4 w-4 mr-2" />
                  Logo Design
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setDesignInput("Create a 10-second intro animation with motion graphics")}
                  data-testid="button-quick-animation"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Motion Graphics
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Output Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Default Format</span>
                  <Badge variant="outline">PNG</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Quality</span>
                  <Badge variant="outline">90%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Auto-Process Queue</span>
                  <Badge className="bg-green-500">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">AI Assist</span>
                  <Badge className="bg-green-500">Enabled</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
