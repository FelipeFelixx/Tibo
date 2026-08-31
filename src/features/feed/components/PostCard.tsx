import { useState } from "react";
import { useI18n } from "@/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Bookmark,
  Copy,
  Flag,
  Globe,
  Link as LinkIcon,
  Lock,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  PlaySquare,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { SignedImage } from "@/features/profile/components/SignedImage";
import { SignedAvatarImage } from "@/features/profile/components/SignedAvatarImage";
import { TiboVerifiedBadge } from "@/features/profile/components/TiboVerifiedBadge";
import { PublicRoleBadge } from "@/features/profile/components/PublicRoleBadge";
import { useQuery } from "@tanstack/react-query";
import { signedImageOptions } from "@/features/profile/queries";
import { deletePost, reportPost, sharePost, toggleSavedPost } from "../api";
import { feedKeys } from "../queries";
import type { PostFull, PostPrivacy } from "../types";
import { MediaGrid } from "./MediaGrid";
import { PollBlock } from "./PollBlock";
import { ReactionBar } from "./ReactionBar";
import { CommentThread } from "./CommentThread";
import { registerExclusiveMedia } from "@/lib/exclusive-media";
import { useEffect, useRef } from "react";

const PRIVACY_META: Record<PostPrivacy, { label: string; icon: typeof Globe }> = {
  publico: { label: "Público", icon: Globe },
  amigos: { label: "Amigos", icon: Users },
  comunidade: { label: "Comunidade", icon: Users },
  rascunho: { label: "Rascunho", icon: Lock },
};

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;

  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;

  return new Date(iso).toLocaleDateString("pt-BR");
}

export function PostCard({
  post: pf,
  currentUserId,
}: {
  post: PostFull;
  currentUserId: string | null;
}) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [openComments, setOpenComments] = useState(false);
  const { post, author, images, video, poll } = pf;
  const isOwner = currentUserId === author.id;
  const displayName = [author.nome, author.sobrenome].filter(Boolean).join(" ") || author.username;
  const PrivacyIcon = PRIVACY_META[post.privacy].icon;

  const invalidate = () => qc.invalidateQueries({ queryKey: feedKeys.all });
  const save = useMutation({
    mutationFn: () => toggleSavedPost(post.id, pf.isSaved),
    onSuccess: () => { invalidate(); toast.success(pf.isSaved ? t("common.removeSaved") : t("feed.saved")); },
    onError: (e: Error) => toast.error(e.message),
  });
  const share = useMutation({
    mutationFn: () => sharePost(post.id),
    onSuccess: () => { invalidate(); toast.success(t("common.share")); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => deletePost(post.id),
    onSuccess: () => { invalidate(); toast.success(t("feed.postRemoved")); },
    onError: (e: Error) => toast.error(e.message),
  });
  const report = useMutation({
    mutationFn: (reason: string) => reportPost(post.id, reason),
    onSuccess: () => toast.success(t("feed.reportSent")),
    onError: (e: Error) => toast.error(e.message),
  });

  const postUrl = typeof window !== "undefined" ? `${window.location.origin}/p/${post.id}` : `/p/${post.id}`;

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <header className="flex items-start justify-between gap-2">
        <Link to="/u/$username" params={{ username: author.username }} className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <SignedAvatarImage bucket="avatars" path={author.avatar_url} alt={displayName} className="h-full w-full object-cover" />
            <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold">{displayName}</span>
              {author.verificado && (
                <TiboVerifiedBadge size="sm" />
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>@{author.username}</span>
              <PublicRoleBadge
                role={author.publicRole}
                className="px-2 py-0.5 text-[10px]"
              />
              <span>·</span>
              <span>{timeAgo(post.created_at)}</span>
              <span>·</span>
              <PrivacyIcon className="h-3 w-3" />
            </div>
          </div>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="min-h-10 min-w-10 shrink-0" aria-label="Opções da publicação"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(postUrl); toast.success(t("feed.linkCopied")); }}>
              <Copy className="mr-2 h-4 w-4" />{t("common.copyLink")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => save.mutate()}>
              <Bookmark className={`mr-2 h-4 w-4 ${pf.isSaved ? "fill-current" : ""}`} />{pf.isSaved ? t("common.removeSaved") : t("common.save")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {isOwner ? (
              <DropdownMenuItem
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive"
            >
                <Trash2 className="mr-2 h-4 w-4" />{t("common.delete", "Excluir")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => {
                const r = window.prompt(t("common.reportReason", "Motivo da denúncia:"));
                if (r && r.trim().length >= 3) report.mutate(r.trim());
              }}><Flag className="mr-2 h-4 w-4" />{t("common.report", "Denunciar")}</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <Trash2 className="h-6 w-6" aria-hidden />
              </div>

              <DialogTitle>Excluir publicação?</DialogTitle>

              <DialogDescription>
                Esta publicação será removida permanentemente. Essa ação não
                poderá ser desfeita.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  remove.mutate();
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir publicação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {post.content && <p className="mt-3 whitespace-pre-wrap text-[15px]">{post.content}</p>}

      {post.link_url && /^https?:\/\//i.test(post.link_url) && (
        <a href={post.link_url} target="_blank" rel="noopener noreferrer nofollow" className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm hover:border-primary/50">
          <LinkIcon className="h-4 w-4 text-primary" />
          <span className="truncate">{post.link_url.replace(/^https?:\/\//i, "")}</span>
        </a>
      )}

      <MediaGrid images={images} />

      {video && (
        <VideoPlayer path={video.storage_path} />
      )}

      {poll && <PollBlock poll={poll} />}

      {(post.location || pf.shareCount > 0) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {post.location && (
            <Badge variant="secondary" className="gap-1"><MapPin className="h-3 w-3" />{post.location}</Badge>
          )}
          {pf.shareCount > 0 && <span>{pf.shareCount} compartilhamento{pf.shareCount === 1 ? "" : "s"}</span>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-1 border-t pt-3">
        <ReactionBar postId={post.id} reactions={pf.reactions} />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="min-h-10" aria-expanded={openComments} onClick={() => setOpenComments((v) => !v)}>
            <MessageCircle className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Comentar</span>
            {pf.commentCount > 0 && <span className="ml-1 text-xs">{pf.commentCount}</span>}
          </Button>
          {video && (
            <Button asChild variant="ghost" size="sm" className="min-h-10">
              <Link to="/clips" aria-label="Abrir nos Clips"><PlaySquare className="mr-1 h-4 w-4" /><span className="hidden sm:inline">Clip</span></Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" className="min-h-10" aria-label="Compartilhar" disabled={share.isPending} onClick={() => share.mutate()}>
            <Share2 className="mr-1 h-4 w-4" /><span className="hidden sm:inline">Compartilhar</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={pf.isSaved ? "Remover dos salvos" : "Salvar publicação"}
            aria-pressed={pf.isSaved}
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className={`min-h-10 ${pf.isSaved ? "text-primary" : ""}`}
          >
            <Bookmark className={`h-4 w-4 ${pf.isSaved ? "fill-current" : ""}`} />
          </Button>
        </div>
      </div>

      {openComments && <CommentThread postId={post.id} currentUserId={currentUserId} />}
    </article>
  );
}

function VideoPlayer({ path }: { path: string }) {
  const { data: url } = useQuery(signedImageOptions("post-media", path));
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const cleanupExclusive = registerExclusiveMedia(video);
    return () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
      cleanupExclusive();
    };
  }, [url]);
  if (!url) return <div className="mt-3 aspect-video animate-pulse rounded-xl bg-muted" />;
  return <div className="mt-3 overflow-hidden rounded-xl bg-black"><video ref={ref} src={url} controls autoPlay muted playsInline loop preload="auto" onLoadedData={(e) => { void e.currentTarget.play().catch(() => undefined); }} className="mx-auto max-h-[620px] w-full aspect-[9/16] object-contain" /></div>;
}