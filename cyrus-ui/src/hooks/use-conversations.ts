import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Conversation } from "@shared/schema";

interface CreateConversationData {
  userId?: string | null;
  role: "user" | "cyrus";
  content: string;
  hasImage?: number;
  imageData?: string | null;
  detectedObjects?: any;
}

export function useConversations(userId?: string, limit: number = 50) {
  return useQuery<Conversation[]>({
    queryKey: ["conversations", userId, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userId) params.append("userId", userId);
      params.append("limit", limit.toString());
      
      const response = await apiRequest("GET", `/api/conversations?${params}`);
      return await response.json();
    },
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateConversationData) => {
      const response = await apiRequest("POST", "/api/conversations", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
