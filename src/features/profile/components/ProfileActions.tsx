import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  Clock,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  UserMinus,
  UserPlus,
  UserX,
} from "lucide-react";
import { getOrCreateDirectConversation } from "@/features/messages/api";
import {
  cancelFriendship,
  followUser,
  respondFriendRequest,
  sendFriendRequest,
  unfollowUser,
} from "../api";
import type { PrivacyAudience, ViewerRelationship } from "../types";
import { profileKeys } from "../queries";

interface Props {
  targetUserId: string;
  viewerId: string | null;
  relationship: ViewerRelationship | null;
  quemPodeAmizade: PrivacyAudience;
  quemPodeSeguir: PrivacyAudience;
  quemPodeMensagem: PrivacyAudience;
}

export function ProfileActions({
  targetUserId,
  viewerId,
  relationship,
  quemPodeAmizade,
  quemPodeSeguir,
  quemPodeMensagem,
}: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const invalidate = () => {
    qc.invalidateQueries({
      queryKey: profileKeys.relationship(targetUserId),
    });
    qc.invalidateQueries({
      queryKey: profileKeys.all,
    });
  };

  const sendFriend = useMutation({
    mutationFn: () => sendFriendRequest(targetUserId),
    onSuccess: () => {
      toast.success("Pedido de amizade enviado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelFriend = useMutation({
    mutationFn: (id: string) => cancelFriendship(id),
    onSuccess: () => {
      toast.success("Amizade removida");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const acceptFriend = useMutation({
    mutationFn: (id: string) => respondFriendRequest(id, "accepted"),
    onSuccess: () => {
      toast.success("Amizade aceita");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectFriend = useMutation({
    mutationFn: (id: string) => respondFriendRequest(id, "rejected"),
    onSuccess: () => {
      toast.success("Solicitação recusada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleFollow = useMutation({
    mutationFn: (isFollowing: boolean) =>
      isFollowing
        ? unfollowUser(targetUserId)
        : followUser(targetUserId),
    onSuccess: (_data, wasFollowing) => {
      toast.success(
        wasFollowing ? "Deixou de seguir" : "Agora você segue",
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openChat = useMutation({
    mutationFn: () => getOrCreateDirectConversation(targetUserId),
    onSuccess: (id) =>
      navigate({
        to: "/mensagens/$id",
        params: { id },
      }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!viewerId) {
    return (
      <Button asChild>
        <Link to="/auth" search={{ mode: "signin" }}>
          Entrar para interagir
        </Link>
      </Button>
    );
  }

  if (relationship?.isOwner) {
    return (
      <Button asChild variant="outline">
        <Link to="/configuracoes/perfil">
          <Pencil className="mr-2 h-4 w-4" />
          Editar perfil
        </Link>
      </Button>
    );
  }

  const friendship = relationship?.friendship ?? null;
  const isFollowing = relationship?.isFollowing ?? false;

  const canFriend = quemPodeAmizade === "todos";
  const canFollow = quemPodeSeguir === "todos";
  const canMessage = quemPodeMensagem === "todos";

  const friendshipAccepted = friendship?.status === "accepted";
  const friendshipPending = friendship?.status === "pending";

  const requestSent =
    friendshipPending && friendship?.requesterId === viewerId;

  const requestReceived =
    friendshipPending && friendship?.requesterId !== viewerId;

  const confirmUnfollow = () => {
    const confirmed = window.confirm(
      "Você realmente quer deixar de seguir esta pessoa?",
    );

    if (confirmed) {
      toggleFollow.mutate(true);
    }
  };

  const confirmUnfriend = () => {
    const confirmed = window.confirm(
      "Você realmente quer desfazer esta amizade?",
    );

    if (confirmed) {
      cancelFriend.mutate(friendship!.id);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {friendshipAccepted ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              disabled={cancelFriend.isPending}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Amigos
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={confirmUnfriend}>
              <UserMinus className="mr-2 h-4 w-4" />
              Desfazer amizade
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : requestReceived ? (
        <>
          <Button
            onClick={() => acceptFriend.mutate(friendship.id)}
            disabled={acceptFriend.isPending}
          >
            <Check className="mr-2 h-4 w-4" />
            Aceitar
          </Button>

          <Button
            variant="outline"
            onClick={() => rejectFriend.mutate(friendship.id)}
            disabled={rejectFriend.isPending}
          >
            <UserX className="mr-2 h-4 w-4" />
            Recusar
          </Button>
        </>
      ) : requestSent ? (
        <Button
          variant="outline"
          onClick={() => cancelFriend.mutate(friendship.id)}
          disabled={cancelFriend.isPending}
        >
          <Clock className="mr-2 h-4 w-4" />
          Solicitação enviada
        </Button>
      ) : canFriend ? (
        <Button
          onClick={() => sendFriend.mutate()}
          disabled={sendFriend.isPending}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Adicionar amigo
        </Button>
      ) : null}

      {canFollow && (
        isFollowing ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                disabled={toggleFollow.isPending}
              >
                Seguindo
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={confirmUnfollow}>
                <UserMinus className="mr-2 h-4 w-4" />
                Deixar de seguir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="secondary"
            onClick={() => toggleFollow.mutate(false)}
            disabled={toggleFollow.isPending}
          >
            Seguir
          </Button>
        )
      )}

      {canMessage && (
        <Button
          variant="ghost"
          onClick={() => openChat.mutate()}
          disabled={openChat.isPending}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Mensagem
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            aria-label="Mais opções"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              toast.info("A função de bloqueio será configurada nesta etapa.")
            }
          >
            Bloquear
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() =>
              toast.info("A função de denúncia será configurada nesta etapa.")
            }
          >
            Denunciar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
