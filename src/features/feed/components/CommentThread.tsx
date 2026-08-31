import { useState } from "react";
import { useI18n } from "@/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Heart, Loader2, MessageCircle, MoreHorizontal, Flag, Pencil, Trash2, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignedImage } from "@/features/profile/components/SignedImage";
import { SignedAvatarImage } from "@/features/profile/components/SignedAvatarImage";
import {
  addComment,
  deleteComment,
  reportComment,
  toggleCommentLike,
  updateComment,
} from "../api";
import { commentsOptions, feedKeys } from "../queries";
import type { CommentNode } from "../types";
import { cn } from "@/lib/utils";

export function CommentThread({ postId, currentUserId }: { postId: string; currentUserId: string | null }) {
  const { t } = useI18n();
  const { data: comments, isLoading } = useQuery(commentsOptions(postId));
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const add = useMutation({
    mutationFn: () => addComment(postId, text.trim(), null),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: feedKeys.comments(postId) });
      qc.invalidateQueries({ queryKey: feedKeys.all });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-3 border-t pt-3">
      {currentUserId && (
        <div className="flex gap-2">
          <Textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("common.commentPlaceholder", "Escreva um comentário...")}
            maxLength={2000}
          />
          <Button
            size="sm"
            disabled={!text.trim() || add.isPending}
            onClick={() => add.mutate()}
          >
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.send", "Enviar")}
          </Button>
        </div>
      )}
      <div className="mt-3 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">{t("common.loadingComments", "Carregando comentários...")}</p>}
        {comments?.map((c) => (
          <CommentItem key={c.id} node={c} postId={postId} currentUserId={currentUserId} depth={0} />
        ))}
        {comments?.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">{t("common.firstComment", "Seja o primeiro a comentar.")}</p>
        )}
      </div>
    </div>
  );
}

function CommentItem({
  node,
  postId,
  currentUserId,
  depth,
}: {
  node: CommentNode;
  postId: string;
  currentUserId: string | null;
  depth: number;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(node.content);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: feedKeys.comments(postId) });
    qc.invalidateQueries({ queryKey: feedKeys.all });
  };
  const like = useMutation({
    mutationFn: () => toggleCommentLike(node.id, node.likedByMe),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const reply = useMutation({
    mutationFn: () => addComment(postId, replyText.trim(), node.id),
    onSuccess: () => { setReplyText(""); setReplying(false); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const save = useMutation({
    mutationFn: () => updateComment(node.id, editText.trim()),
    onSuccess: () => { setEditing(false); invalidate(); toast.success(t("common.commentUpdated", "Comentário atualizado")); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => deleteComment(node.id),
    onSuccess: () => { invalidate(); toast.success(t("common.commentRemoved", "Comentário removido")); },
    onError: (e: Error) => toast.error(e.message),
  });
  const report = useMutation({
    mutationFn: (reason: string) => reportComment(node.id, reason),
    onSuccess: () => toast.success(t("common.reportSent", "Denúncia enviada")),
    onError: (e: Error) => toast.error(e.message),
  });

  const isOwner = currentUserId === node.author.id;
  const displayName = [node.author.nome, node.author.sobrenome].filter(Boolean).join(" ") || node.author.username;

  return (
    <div className={cn(depth > 0 && "ml-6 sm:ml-10")}>
      <div className="flex gap-2">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <SignedAvatarImage bucket="avatars" path={node.author.avatar_url} alt={displayName} className="h-full w-full object-cover" />
          <AvatarFallback className="text-xs">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl bg-muted/50 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{displayName}</span>
              {currentUserId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isOwner ? (
                      <>
                        <DropdownMenuItem onClick={() => setEditing(true)}><Pencil className="mr-2 h-4 w-4" />{t("common.edit", "Editar")}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => remove.mutate()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />{t("common.delete", "Excluir")}</DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem onClick={() => {
                        const reason = window.prompt(t("common.reportReason", "Motivo da denúncia:"));
                        if (reason && reason.trim().length >= 3) report.mutate(reason.trim());
                      }}><Flag className="mr-2 h-4 w-4" />{t("common.report", "Denunciar")}</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {editing ? (
              <div className="mt-1 space-y-2">
                <Textarea rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} maxLength={2000} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}><Check className="mr-1 h-3 w-3" />{t("common.save", "Salvar")}</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditText(node.content); }}>{t("common.cancel", "Cancelar")}</Button>
                </div>
              </div>
            ) : (
              <p className="mt-0.5 whitespace-pre-wrap text-sm">{node.content}</p>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 px-3 text-xs text-muted-foreground">
            <button
              onClick={() => like.mutate()}
              disabled={!currentUserId || like.isPending}
              className={cn("inline-flex items-center gap-1 hover:text-foreground", node.likedByMe && "text-primary")}
            >
              <Heart className={cn("h-3.5 w-3.5", node.likedByMe && "fill-current")} />
              {node.likeCount > 0 && node.likeCount}
            </button>
            {currentUserId && (
              <button className="hover:text-foreground" onClick={() => setReplying((v) => !v)}>
                <MessageCircle className="mr-1 inline h-3.5 w-3.5" />{t("common.reply", "Responder")}
              </button>
            )}
            {node.edited_at && <span>{t("common.edited", "editado")}</span>}
          </div>
          {replying && (
            <div className="mt-2 flex gap-2">
              <Textarea rows={2} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={t("common.replyTo", `Responder a ${displayName}`)} maxLength={2000} />
              <Button size="sm" onClick={() => reply.mutate()} disabled={!replyText.trim() || reply.isPending}>{t("common.send", "Enviar")}</Button>
            </div>
          )}
          {node.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {node.replies.map((r) => (
                <CommentItem key={r.id} node={r} postId={postId} currentUserId={currentUserId} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}