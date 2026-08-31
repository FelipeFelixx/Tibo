import { queryOptions } from "@tanstack/react-query";
import { countUnreadNotifications, fetchNotifications } from "./api";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => ["notifications", "list"] as const,
  unread: () => ["notifications", "unread"] as const,
};

export const notificationsOptions = () =>
  queryOptions({
    queryKey: notificationKeys.list(),
    queryFn: () => fetchNotifications(),
    staleTime: 20_000,
  });

export const unreadNotificationsOptions = () =>
  queryOptions({
    queryKey: notificationKeys.unread(),
    queryFn: () => countUnreadNotifications(),
    staleTime: 20_000,
  });