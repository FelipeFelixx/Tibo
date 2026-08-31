import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  Check,
  Heart,
  MessageCircle,
  MoreVertical,
  Pause,
  Play,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SignedImage } from "@/features/profile/components/SignedImage";
import { SignedAvatarImage } from "@/features/profile/components/SignedAvatarImage";
import { signedImageOptions } from "@/features/profile/queries";
import { CommentThread } from "@/features/feed/components/CommentThread";
import { incrementClipView, sharePost, setReaction, toggleSavedPost } from "@/features/feed/api";
import { feedKeys } from "@/features/feed/queries";
import { clipsKeys } from "../queries";
import type { PostFull } from "@/features/feed/types";
import { registerExclusiveMedia } from "@/lib/exclusive-media";

function displayName(post: PostFull) {
  return [post.author.nome, post.author.sobrenome].filter(Boolean).join(" ") || post.author.username;
}

export function ClipViewer({ post: pf, currentUserId }: { post: PostFull; currentUserId: string | null }) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewedRef = useRef(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const { data: url } = useQuery(signedImageOptions("post-media", pf.video?.storage_path ?? ""));

  const reaction = useMutation({
    mutationFn: () => setReaction(pf.post.id, pf.reactions.myReaction ? null : "curtir"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.all });
      qc.invalidateQueries({ queryKey: clipsKeys.all });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () => toggleSavedPost(pf.post.id, pf.isSaved),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.all });
      qc.invalidateQueries({ queryKey: clipsKeys.all });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const share = useMutation({
    mutationFn: () => sharePost(pf.post.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.all });
      qc.invalidateQueries({ queryKey: clipsKeys.all });
      toast.success(t("clips.shared", "Clip compartilhado"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    viewedRef.current = false;
  }, [pf.post.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    let visible = false;

    const tryPlay = () => {
      if (!visible || video.ended) return;

      video.muted = muted;

      void video.play().catch(() => {
        // O navegador pode aguardar o vídeo ficar pronto.
      });
    };

    const handleCanPlay = () => {
      tryPlay();
    };

    const handleLoadedData = () => {
      tryPlay();
    };

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? false;

        if (!visible) {
          video.pause();
          return;
        }

        tryPlay();
      },
      { threshold: 0.35 },
    );

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadeddata", handleLoadedData);

    io.observe(video);

    if (video.readyState >= 2) {
      requestAnimationFrame(tryPlay);
    }

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadeddata", handleLoadedData);
      io.disconnect();
      video.pause();
    };
  }, [url, muted]);
  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
      } catch {
        // O navegador pode bloquear a reprodução automática.
      }
    } else {
      video.pause();
    }
  }

  async function toggleAudio() {
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !muted;

    video.muted = nextMuted;
    setMuted(nextMuted);

    if (video.paused) {
      try {
        await video.play();
      } catch {
        // O usuário poderá iniciar pelo botão de reprodução.
      }
    }
  }

  function handlePlay() {
    setPlaying(true);
    if (!viewedRef.current) {
      viewedRef.current = true;
      void incrementClipView(pf.post.id).catch((error) => {
        console.warn("[Clips] não foi possível registrar visualização", error);
      });
    }
  }

  return (
    <section id={`clip-${pf.post.id}`} className="relative h-[100dvh] min-h-[34rem] w-full snap-start overflow-hidden bg-black text-white">
      {url ? (
        <video
          src={url}
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-3xl"
          muted
          playsInline
          loop
          aria-hidden
        />
      ) : null}

      <div className="absolute inset-0 bg-black/35" />

      {url ? (
        <video
          ref={videoRef}
          src={url}
          controls={false}
          playsInline
          loop
          autoPlay
          muted={muted}
          preload="auto"
          onLoadedData={(e) => { if (e.currentTarget.paused) void e.currentTarget.play().catch(() => undefined); }}
          onError={() => toast.error(t("clips.videoError", "Não foi possível carregar este vídeo neste navegador."))}
          className="absolute inset-0 z-10 h-full w-full object-contain"
          onPlay={handlePlay}
          onPause={() => setPlaying(false)}
          onClick={togglePlayback}
        />
      ) : null}

      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="rounded-full bg-black/30 px-3 py-1.5 text-sm font-semibold backdrop-blur">
          Tibo <span className="text-primary">Clips</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full bg-black/30 text-white hover:bg-white/15 hover:text-white" aria-label={t("common.moreOptions", "Mais opções")}>
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(`${window.location.origin}/p/${pf.post.id}`)}>
              {t("common.copyLink", "Copiar link")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-end justify-between gap-4 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <div className="min-w-0 max-w-[72%] drop-shadow-lg">
          <Link to="/u/$username" params={{ username: pf.author.username }} className="flex items-center gap-2">
            <Avatar className="h-10 w-10 border border-white/30">
              <SignedAvatarImage bucket="avatars" path={pf.author.avatar_url} alt={displayName(pf)} className="h-full w-full object-cover" />
              <AvatarFallback>{displayName(pf).slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-semibold">@{pf.author.username}</span>
          </Link>
          {pf.post.content ? <p className="mt-2 line-clamp-3 text-sm leading-5">{pf.post.content}</p> : null}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-black/35 text-white hover:bg-white/15 hover:text-white"
            aria-label={t("clips.like", "Curtir Clip")}
            aria-pressed={pf.reactions.myReaction === "curtir"}
            onClick={() => reaction.mutate()}
          >
            <Heart className={pf.reactions.myReaction === "curtir" ? "h-6 w-6 fill-current text-red-400" : "h-6 w-6"} />
          </Button>
          <span className="-mt-2 text-[11px]">{pf.reactions.total || ""}</span>

          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-black/35 text-white hover:bg-white/15 hover:text-white"
            aria-label={t("common.comments", "Comentários")}
            onClick={() => setCommentsOpen(true)}
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
          {pf.commentCount > 0 ? <span className="-mt-2 text-[11px]">{pf.commentCount}</span> : null}

          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-black/35 text-white hover:bg-white/15 hover:text-white"
            aria-label={t("common.share", "Compartilhar")}
            disabled={share.isPending}
            onClick={() => share.mutate()}
          >
            <Share2 className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-black/35 text-white hover:bg-white/15 hover:text-white"
            aria-label={pf.isSaved ? t("common.removeSaved", "Remover dos salvos") : t("clips.save", "Salvar Clip")}
            aria-pressed={pf.isSaved}
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {pf.isSaved ? <Check className="h-6 w-6" /> : <Bookmark className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      <div className="absolute bottom-24 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
          <button
            type="button"
            onClick={togglePlayback}
            className="grid h-12 w-12 place-items-center rounded-full bg-black/30 text-white backdrop-blur transition hover:bg-black/50"
            aria-label={playing ? t("clips.pause", "Pausar Clip") : t("clips.play", "Reproduzir Clip")}
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={toggleAudio}
            className="grid h-12 w-12 place-items-center rounded-full bg-black/30 text-white backdrop-blur transition hover:bg-black/50"
            aria-label={muted ? t("clips.enableAudio", "Ativar áudio") : t("clips.disableAudio", "Desativar áudio")}
            aria-pressed={!muted}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>

      <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
        <DialogContent className="max-h-[85dvh] max-w-xl overflow-y-auto">
          <DialogTitle>{t("common.comments", "Comentários")}</DialogTitle>
          <CommentThread postId={pf.post.id} currentUserId={currentUserId} />
        </DialogContent>
      </Dialog>
    </section>
  );
}
