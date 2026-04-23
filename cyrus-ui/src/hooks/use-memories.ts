import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Memory } from "@shared/schema";

interface CreateMemoryData {
  userId?: string | null;
  type: "person" | "place" | "thing" | "conversation";
  description: string;
}

export function useMemories(userId?: string) {
  return useQuery<Memory[]>({
    queryKey: ["memories", userId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userId) params.append("userId", userId);
      
      const response = await apiRequest("GET", `/api/memories?${params}`);
      return await response.json();
    },
  });
}

export function useCreateMemory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateMemoryData) => {
      const response = await apiRequest("POST", "/api/memories", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    },
  });
}
