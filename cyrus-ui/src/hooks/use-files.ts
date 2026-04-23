import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { systemFetch } from "@/lib/system-api";
import type { UploadedFile } from "@shared/schema";

export function useUploadedFiles(userId?: string) {
  return useQuery<UploadedFile[]>({
    queryKey: ["files", userId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userId) params.append("userId", userId);
      
      const response = await apiRequest("GET", `/api/files?${params}`);
      return await response.json();
    },
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await systemFetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload file");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}
