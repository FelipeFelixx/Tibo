import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Eye, Heart, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SignedImage } from "@/features/profile/components/SignedImage";
import { SignedAvatarImage } from "@/features/profile/components/SignedAvatarImage";
import { signedImageOptions } from "@/features/profile/queries";
import { deleteStory, markStoryViewed, replyToStory, toggleStoryLike } from "../api";
import { storyFeedOptions, storyKeys, storyViewersOptions } from "../queries";
import type { StoryGroup, StoryItem } from "../types";
import { registerExclusiveMedia } from "@/lib/exclusive-media";

interface StoryViewerProps {
  groups: StoryGroup[];
  startIndex: number;
  currentUserId: string;
  onClose: () => void;
}

export function StoryViewer({ groups, startIndex, currentUserId, onClose }: StoryViewerProps) {
  const qc = useQueryClient();
  const [gi, setGi] = useState(startIndex);
  const [si, setSi] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reply, setReply] = useState("");
  const [showViewers, setShowViewers] = useState(false);
  const storyVideoRef = useRef<HTMLVideoElement>(null);

  const group = groups[gi];
  const story: StoryItem | undefined = group?.stories[si];
  const isMine = group?.author.id === currentUserId;
  const { data: mediaUrl } = useQuery(signedImageOptions("stories", story?.storage_path ?? null));
  const { data: viewers = [] } = useQuery(storyViewersOptions(showViewers && story ? story.id : null));

  const next = useCallback(() => {
    setProgress(0);
    if (!group) return onClose();
    if (si + 1 < group.stories.length) return setSi(si + 1);
    if (gi + 1 < groups.length) { setGi(gi + 1); setSi(0); return; }
    onClose();
  }, [gi, si, group, groups.length, onClose]);

  const prev = useCallback(() => {
    setProgress(0);
    if (si > 0) return setSi(si - 1);
    if (gi > 0) { setGi(gi - 1); setSi(0); return; }
  }, [gi, si]);

  // mark viewed
  const seenRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!story || seenRef.current.has(story.id)) return;
    seenRef.current.add(story.id);
    markStoryViewed(story.id).then(() => qc.invalidateQueries({ queryKey: storyFeedOptions().queryKey }));
  }, [story, qc]);

  // progress timer
  const durationMs = (story?.media_type === "video" ? (story.duration_seconds ?? 15) : 5) * 1000;
  useEffect(() => {
    if (paused || showViewers || !story) return;
    const started = Date.now();
    const id = window.setInterval(() => {
      const pct = Math.min(((Date.now() - started) / durationMs) * 100, 100);
      setProgress(pct);
      if (pct >= 100) { window.clearInterval(id); next(); }
    }, 50);
    return () => window.clearInterval(id);
  }, [story?.id, paused, showViewers, durationMs, next, story]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  const like = useMutation({
    mutationFn: () => toggleStoryLike(story!.id, story!.likedByMe),
    onSuccess: () => qc.invalidateQueries({ queryKey: storyKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });
  const sendReply = useMutation({
    mutationFn: () => replyToStory(story!.id, reply.trim()),
    onSuccess: () => { setReply(""); toast.success("Resposta enviada"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => deleteStory(story!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: storyKeys.all }); toast.success("Story excluído"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    const video = storyVideoRef.current;
    if (!video) return;
    const cleanupExclusive = registerExclusiveMedia(video);
    return () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
      cleanupExclusive();
    };
  }, [story?.id, mediaUrl]);

  if (!group || !story) return null;
  const name = [group.author.nome, group.author.sobrenome].filter(Boolean).join(" ") || group.author.username;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black animate-fade-in">
      <div className="flex gap-1 px-3 pt-3">
        {group.stories.map((s, i) => (
          <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full bg-white transition-[width] duration-75"
              style={{ width: i < si ? "100%" : i === si ? `${progress}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      <header className="flex items-center gap-3 px-3 py-3 text-white">
        <Avatar className="h-9 w-9">
          <SignedAvatarImage bucket="avatars" path={group.author.avatar_url} alt={name} className="h-full w-full object-cover" />
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-xs text-white/60">
            @{group.author.username}
            {story.music_title ? ` · ♫ ${story.music_title}` : ""}
          </p>
        </div>
        {isMine && (
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => remove.mutate()}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </header>

      <div
        className="relative flex-1 select-none"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        {mediaUrl ? (
          story.media_type === "video" ? (
            <video ref={storyVideoRef} src={mediaUrl} autoPlay playsInline controls={false} className="h-full w-full object-contain" onEnded={next} onPlay={() => setPaused(false)} />
          ) : (
            <img src={mediaUrl} alt={story.caption ?? "Story"} className="h-full w-full object-contain" />
          )
        ) : (
          <div className="h-full w-full animate-pulse bg-white/10" />
        )}

        <button type="button" aria-label="Anterior" onClick={prev} className="absolute left-0 top-0 h-full w-1/3" />
        <button type="button" aria-label="Próximo" onClick={next} className="absolute right-0 top-0 h-full w-1/3" />
        <ChevronLeft className="pointer-events-none absolute left-2 top-1/2 h-6 w-6 -translate-y-1/2 text-white/40" />
        <ChevronRight className="pointer-events-none absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 text-white/40" />

        {story.caption && (
          <p className="absolute bottom-4 left-4 right-4 rounded-xl bg-black/40 p-3 text-center text-sm text-white">
            {story.caption}
          </p>
        )}
      </div>

      <footer className="flex items-center gap-2 border-t border-white/10 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {isMine ? (
          <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => setShowViewers((v) => !v)}>
            <Eye className="mr-2 h-4 w-4" />{story.viewCount} visualizaç{story.viewCount === 1 ? "ão" : "ões"} · <Heart className="mx-1 inline h-4 w-4" />{story.likeCount}
          </Button>
        ) : (
          <>
            <Input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              placeholder="Responder…"
              className="border-white/20 bg-white/10 text-white placeholder:text-white/50"
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              disabled={reply.trim().length === 0 || sendReply.isPending}
              onClick={() => sendReply.mutate()}
            >
              <Send className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => like.mutate()}>
              <Heart className={`h-5 w-5 ${story.likedByMe ? "fill-rose-500 text-rose-500" : ""}`} />
            </Button>
          </>
        )}
      </footer>

      {showViewers && (
        <div className="absolute inset-x-0 bottom-0 max-h-[55%] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-4 animate-slide-in-right">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Visualizações</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowViewers(false)}><X className="h-4 w-4" /></Button>
          </div>
          {viewers.length === 0 && <p className="text-sm text-muted-foreground">Ninguém viu este story ainda.</p>}
          <ul className="space-y-3">
            {viewers.map((v) => {
              const vn = [v.user.nome, v.user.sobrenome].filter(Boolean).join(" ") || v.user.username;
              return (
                <li key={v.user.id} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <SignedAvatarImage bucket="avatars" path={v.user.avatar_url} alt={vn} className="h-full w-full object-cover" />
                    <AvatarFallback>{vn.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{vn}</p>
                    <p className="text-xs text-muted-foreground">@{v.user.username}</p>
                  </div>
                  {v.liked && <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}