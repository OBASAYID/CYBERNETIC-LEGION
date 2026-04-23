import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, File, Image, Video, Trash2, Download, X, FileText, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { systemFetch } from "@/lib/system-api";
import { getSessionToken } from "@/lib/auth-storage";

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

interface FileUploadProps {
  onFileSelect?: (file: UploadedFile) => void;
  onAnalyze?: (file: UploadedFile) => void;
  compact?: boolean;
}

export function FileUpload({ onFileSelect, onAnalyze, compact = false }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: files = [], isLoading } = useQuery<UploadedFile[]>({
    queryKey: ["/api/files"],
  });

  // Get session token from localStorage
  const getAuthHeaders = (): HeadersInit => {
    const sessionToken = getSessionToken();
    if (sessionToken) {
      return { "X-Cyrus-Session-Token": sessionToken };
    }
    return {};
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await systemFetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      setUploadProgress(null);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      setUploadProgress(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await systemFetch(`/api/files/${fileId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Delete failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach((file) => {
      uploadMutation.mutate(file);
    });
  }, [uploadMutation]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      Array.from(selectedFiles).forEach((file) => {
        uploadMutation.mutate(file);
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [uploadMutation]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith("image/")) return <Image className="w-4 h-4 text-cyan-400" />;
    if (mimetype.startsWith("video/")) return <Video className="w-4 h-4 text-purple-400" />;
    if (mimetype.includes("pdf")) return <FileText className="w-4 h-4 text-red-400" />;
    if (mimetype.includes("zip") || mimetype.includes("tar") || mimetype.includes("gzip")) 
      return <Archive className="w-4 h-4 text-yellow-400" />;
    return <File className="w-4 h-4 text-slate-400" />;
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
            isDragOver 
              ? "border-cyan-400 bg-cyan-500/10" 
              : "border-slate-600 hover:border-cyan-500/50 bg-slate-800/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          data-testid="file-upload-dropzone"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            data-testid="file-upload-input"
          />
          <Upload className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
          <p className="text-xs text-slate-400">
            {uploadMutation.isPending ? "Uploading..." : "Drop files or click to upload"}
          </p>
        </div>

        {files.length > 0 && (
          <div className="flex gap-2 overflow-x-auto py-1">
            {files.slice(0, 5).map((file) => (
              <div
                key={file.id}
                className="flex-shrink-0 w-12 h-12 rounded bg-slate-700 flex items-center justify-center cursor-pointer hover:ring-2 ring-cyan-400"
                onClick={() => onFileSelect?.(file)}
                data-testid={`file-thumbnail-${file.id}`}
              >
                {file.isImage ? (
                  <img src={file.url} alt={file.originalName} className="w-full h-full object-cover rounded" />
                ) : (
                  getFileIcon(file.mimetype)
                )}
              </div>
            ))}
            {files.length > 5 && (
              <div className="flex-shrink-0 w-12 h-12 rounded bg-slate-700 flex items-center justify-center text-xs text-slate-400">
                +{files.length - 5}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="bg-slate-900/80 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-cyan-400 flex items-center gap-2">
          <Upload className="w-4 h-4" />
          File Upload Center
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all",
            isDragOver 
              ? "border-cyan-400 bg-cyan-500/10" 
              : "border-slate-600 hover:border-cyan-500/50 bg-slate-800/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          data-testid="file-upload-dropzone-full"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            data-testid="file-upload-input-full"
          />
          <Upload className="w-10 h-10 mx-auto mb-3 text-cyan-400" />
          <p className="text-sm text-slate-300 mb-1">
            {uploadMutation.isPending ? "Uploading..." : "Drag & drop files here"}
          </p>
          <p className="text-xs text-slate-500">
            or click to browse (Images, Videos, PDFs, up to 50MB)
          </p>
        </div>

        {isLoading && (
          <div className="text-center text-slate-400 text-sm">Loading files...</div>
        )}

        {files.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <div className="text-xs text-slate-500 uppercase tracking-wide">
              Uploaded Files ({files.length})
            </div>
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-2 rounded bg-slate-800/50 hover:bg-slate-700/50 group"
                data-testid={`file-item-${file.id}`}
              >
                <div className="w-10 h-10 rounded bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {file.isImage ? (
                    <img src={file.url} alt={file.originalName} className="w-full h-full object-cover" />
                  ) : file.isVideo ? (
                    <video src={file.url} className="w-full h-full object-cover" muted />
                  ) : (
                    getFileIcon(file.mimetype)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200 truncate">{file.originalName}</div>
                  <div className="text-xs text-slate-500">
                    {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {(file.isImage || file.isVideo) && onAnalyze && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onAnalyze(file)}
                      data-testid={`analyze-file-${file.id}`}
                    >
                      <FileText className="w-3 h-3" />
                    </Button>
                  )}
                  <a href={file.url} download={file.originalName}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`download-file-${file.id}`}>
                      <Download className="w-3 h-3" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-300"
                    onClick={() => deleteMutation.mutate(file.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`delete-file-${file.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {files.length === 0 && !isLoading && (
          <div className="text-center text-slate-500 text-sm py-4">
            No files uploaded yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FilePreviewModal({ 
  file, 
  onClose,
  onAnalyze 
}: { 
  file: UploadedFile | null; 
  onClose: () => void;
  onAnalyze?: (file: UploadedFile) => void;
}) {
  if (!file) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-lg max-w-4xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <File className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-slate-200">{file.originalName}</span>
          </div>
          <div className="flex gap-2">
            {onAnalyze && (file.isImage || file.isVideo) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAnalyze(file)}
                className="border-cyan-500/50 text-cyan-400"
              >
                <FileText className="w-3 h-3 mr-1" />
                Analyze with CYRUS
              </Button>
            )}
            <a href={file.url} download={file.originalName}>
              <Button variant="outline" size="sm" className="border-slate-600">
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
            </a>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="p-4">
          {file.isImage && (
            <img src={file.url} alt={file.originalName} className="max-w-full max-h-[70vh] mx-auto" />
          )}
          {file.isVideo && (
            <video src={file.url} controls className="max-w-full max-h-[70vh] mx-auto" />
          )}
          {!file.isImage && !file.isVideo && (
            <div className="text-center py-8">
              <File className="w-16 h-16 mx-auto mb-4 text-slate-500" />
              <p className="text-slate-400">Preview not available for this file type</p>
              <p className="text-sm text-slate-500 mt-1">{file.mimetype}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
