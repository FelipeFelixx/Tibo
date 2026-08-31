import { queryOptions } from "@tanstack/react-query";
import { fetchConversations, fetchUnreadTotal } from "./api";

export const conversationsOptions = () =>
  queryOptions({ queryKey: ["conversations"], queryFn: fetchConversations, staleTime: 15_000 });

export const unreadTotalOptions = () =>
  queryOptions({ queryKey: ["messages", "unread-total"], queryFn: fetchUnreadTotal, staleTime: 10_000 });