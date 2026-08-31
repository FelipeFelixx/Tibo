import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Camera,
  Image,
  Link as LinkIcon,
  Loader2,
  Video,
  Pencil,
  MapPin,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

import { SignedImage } from "@/features/profile/components/SignedImage";
import { SignedAvatarImage } from "@/features/profile/components/SignedAvatarImage";
import {
  ACCEPTED_TYPES,
  resizeImage,
  validateImageFile,
} from "@/features/profile/image-utils";
import { PostCamera } from "@/features/media/components/PostCamera";
import { MediaEditor } from "@/features/media/components/MediaEditor";
import { createPost } from "../api";
import { feedKeys } from "../queries";
import type { PostPrivacy } from "../types";
import type { Profile } from "@/features/profile/types";

const PRIVACY_OPTIONS: Array<{
  value: PostPrivacy;
  label: string;
}> = [
  { value: "publico", label: "Público" },
  { value: "amigos", label: "Amigos" },
  { value: "comunidade", label: "Comunidade" },
  { value: "rascunho", label: "Rascunho" },
];

interface PollDraft {
  question: string;
  allow_multiple: boolean;
  options: string[];
}

export function PostComposer({
  me,
  communityId,
  textOnly = false,
  onPublished,
}: {
  me: Profile;
  communityId?: string;
  textOnly?: boolean;
  onPublished?: () => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  // Trava síncrona contra duplo toque no celular.
  // useMutation().isPending sozinho pode atualizar depois de um segundo toque.
  const submitLockRef = useRef(false);

  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState<PostPrivacy>("publico");

  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  const [showCamera, setShowCamera] = useState(false);
  const [editingMedia, setEditingMedia] = useState<{ file: File; kind: "image" | "video" } | null>(null);

  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const [showLocation, setShowLocation] = useState(false);
  const [location, setLocation] = useState("");

  const [poll, setPoll] = useState<PollDraft | null>(null);

  async function addImageFiles(files: File[]) {
    const remaining = 10 - images.length;

    if (remaining <= 0) {
      toast.error(t("post.maxPhotos", "Você pode adicionar no máximo 10 fotos."));
      return;
    }

    const accepted: File[] = [];

    for (const file of files.slice(0, remaining)) {
      const err = validateImageFile(file);

      if (err) {
        toast.error(err);
        continue;
      }

      try {
        const resized = await resizeImage(file, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.85,
        });

        accepted.push(resized);
      } catch (error) {
        console.error(
          "[PostComposer] erro ao processar imagem:",
          error
        );
        toast.error(t("post.imageProcessError", "Não foi possível processar uma das fotos."));
      }
    }

    if (!accepted.length) return;

    setImages((prev) => [...prev, ...accepted]);

    setPreviews((prev) => [
      ...prev,
      ...accepted.map((file) => URL.createObjectURL(file)),
    ]);
  }

  async function handleFiles(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(e.target.files ?? []);

    e.target.value = "";

    await addImageFiles(files);
  }

  function handleVideoFile(file: File | undefined) {
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error(t("post.selectVideo", "Selecione um arquivo de vídeo."));
      return;
    }

    const maxSize = 100 * 1024 * 1024;

    if (file.size > maxSize) {
      toast.error(t("post.videoMaxSize", "O vídeo pode ter no máximo 100MB."));
      return;
    }

    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }

    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  }

  function editImage(index: number) {
    const file = images[index];
    if (file) setEditingMedia({ file, kind: "image" });
  }

  function editVideo() {
    if (video) setEditingMedia({ file: video, kind: "video" });
  }

  async function handleEditedMedia(file: File) {
    if (!editingMedia) return;
    if (editingMedia.kind === "image") {
      const index = images.findIndex((item) => item === editingMedia.file);
      if (index < 0) { setEditingMedia(null); return; }
      const oldPreview = previews[index];
      if (oldPreview) URL.revokeObjectURL(oldPreview);
      const nextPreview = URL.createObjectURL(file);
      setImages((prev) => prev.map((item, i) => i === index ? file : item));
      setPreviews((prev) => prev.map((item, i) => i === index ? nextPreview : item));
    } else {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideo(file);
      setVideoPreview(URL.createObjectURL(file));
    }
    setEditingMedia(null);
  }

  function removeVideo() {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }

    setVideo(null);
    setVideoPreview(null);

    if (videoRef.current) {
      videoRef.current.value = "";
    }
  }

  async function handleCameraCapture(file: File) {
    setShowCamera(false);
    await addImageFiles([file]);
  }

  function removeImage(index: number) {
    setImages((prev) =>
      prev.filter((_, i) => i !== index)
    );

    setPreviews((prev) => {
      const url = prev[index];

      if (url) {
        URL.revokeObjectURL(url);
      }

      return prev.filter((_, i) => i !== index);
    });
  }

  const publish = useMutation({
    mutationFn: () => {
      const url = showLink ? linkUrl.trim() : "";

      if (
        url &&
        !/^https?:\/\//i.test(url)
      ) {
        throw new Error(
          t("post.invalidLink", "O link precisa começar com http:// ou https://")
        );
      }

      return createPost({
        content: content.trim(),
        privacy,
        images,
        video,
        location: showLocation
          ? location.trim()
          : undefined,
        link_url: url || undefined,
        poll:
          poll &&
          poll.options.filter(
            (option) => option.trim()
          ).length >= 2
            ? {
                question: poll.question.trim(),
                allow_multiple: poll.allow_multiple,
                options: poll.options
                  .map((option) => option.trim())
                  .filter(Boolean),
              }
            : null,
        community_id: communityId ?? null,
      });
    },

    onSuccess: () => {
      // Libera a trava somente depois que a publicação terminou com sucesso.
      submitLockRef.current = false;

      toast.success(t("post.published", "Publicado!"));

      setContent("");
      setImages([]);

      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }

      setVideo(null);
      setVideoPreview(null);

      previews.forEach((url) =>
        URL.revokeObjectURL(url)
      );

      setPreviews([]);

      setShowLink(false);
      setLinkUrl("");

      setShowLocation(false);
      setLocation("");

      setPoll(null);

      qc.invalidateQueries({
        queryKey: feedKeys.all,
      });

      onPublished?.();
    },

    onError: (error: Error) => {
      // Se falhar, libera para o usuário tentar novamente.
      submitLockRef.current = false;

      toast.error(error.message);
    },
  });

  const canPublish =
    (
      content.trim().length > 0 ||
      images.length > 0 ||
      video !== null ||
      poll
    ) &&
    !publish.isPending;

  function handlePublish() {
    // Esta verificação acontece imediatamente, antes do React renderizar novamente.
    if (submitLockRef.current) {
      console.warn(
        "[PostComposer] publicação ignorada: operação já em andamento."
      );
      return;
    }

    if (!canPublish) {
      return;
    }

    // Trava ANTES de chamar mutate().
    submitLockRef.current = true;

    console.log("[PostComposer] iniciando publicação única");

    publish.mutate();
  }

  const displayName =
    [me.nome, me.sobrenome]
      .filter(Boolean)
      .join(" ") || me.username;

  if (textOnly) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <SignedAvatarImage
              bucket="avatars"
              path={me.avatar_url}
              alt={displayName}
              className="h-full w-full object-cover"
            />
            <AvatarFallback>
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <Textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("post.thinking", `No que você está pensando, ${me.nome ?? me.username}?`)}
            className="resize-none"
            maxLength={5000}
          />
        </div>

        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <Select
            value={privacy}
            onValueChange={(value) => setPrivacy(value as PostPrivacy)}
          >
            <SelectTrigger className="min-h-10 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIVACY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            className="min-h-10"
            onClick={handlePublish}
            disabled={!canPublish}
          >
            {publish.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Publicar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {editingMedia && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <MediaEditor file={editingMedia.file} kind={editingMedia.kind} submitLabel={t("common.apply", "Aplicar")} onCancel={() => setEditingMedia(null)} onDone={handleEditedMedia} />
        </div>
      )}

      {showCamera && (
        <PostCamera
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <SignedAvatarImage
              bucket="avatars"
              path={me.avatar_url}
              alt={displayName}
              className="h-full w-full object-cover"
            />

            <AvatarFallback>
              {displayName
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <Textarea
            rows={3}
            value={content}
            onChange={(e) =>
              setContent(e.target.value)
            }
            placeholder={t("post.thinking", `No que você está pensando, ${me.nome ?? me.username}?`)}
            className="resize-none"
            maxLength={5000}
          />
        </div>

        {previews.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {previews.map((src, index) => (
              <div
                key={`${src}-${index}`}
                className="relative aspect-square overflow-hidden rounded-xl bg-muted"
              >
                <img
                  src={src}
                  alt={`Foto ${index + 1}`}
                  className="h-full w-full object-cover"
                />

                <div className="absolute right-1 top-1 flex gap-1">
                  <button type="button" onClick={() => editImage(index)} className="rounded-full bg-black/70 p-1.5 text-white" aria-label={`Editar foto ${index + 1}`}>
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => removeImage(index)} className="rounded-full bg-black/70 p-1.5 text-white" aria-label={`Remover foto ${index + 1}`}>
                    <X className="h-3 w-3" />
                  </button>
                </div>

                {index === 0 &&
                  images.length > 1 && (
                    <div className="absolute bottom-1 left-1 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white">
                      1/{images.length}
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}

        {videoPreview && (
          <div className="relative mt-3 overflow-hidden rounded-xl bg-black">
            <video src={videoPreview} controls autoPlay muted playsInline preload="auto" className="max-h-[420px] min-h-[240px] w-full bg-black object-contain" />
            <div className="absolute right-2 top-2 flex gap-2">
              <button type="button" onClick={editVideo} className="rounded-full bg-black/70 p-2 text-white" aria-label="Editar vídeo"><Pencil className="h-4 w-4" /></button>
              <button type="button" onClick={removeVideo} className="rounded-full bg-black/70 p-2 text-white" aria-label="Remover vídeo"><X className="h-4 w-4" /></button>
            </div>

            <div className="absolute bottom-2 left-2 max-w-[80%] truncate rounded-lg bg-black/70 px-2 py-1 text-xs text-white">
              {video?.name}
            </div>
          </div>
        )}

        {showLink && (
          <Input
            className="mt-3"
            placeholder="https://..."
            value={linkUrl}
            onChange={(e) =>
              setLinkUrl(e.target.value)
            }
          />
        )}

        {showLocation && (
          <Input
            className="mt-3"
            placeholder={t("post.locationPlaceholder", "Onde você está?")}
            value={location}
            onChange={(e) =>
              setLocation(e.target.value)
            }
          />
        )}

        {poll && (
          <PollEditor
            poll={poll}
            setPoll={setPoll}
            onRemove={() => setPoll(null)}
            t={t}
          />
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <div className="flex flex-wrap gap-1">
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              multiple
              hidden
              onChange={handleFiles}
            />

            <input
              ref={videoRef}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => {
                handleVideoFile(
                  e.target.files?.[0]
                );
                e.target.value = "";
              }}
            />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-10"
              aria-label={t("post.addPhotos", "Adicionar fotos")}
              onClick={() =>
                fileRef.current?.click()
              }
              disabled={images.length >= 10}
            >
              <Image className="mr-1 h-4 w-4" />

              <span className="hidden sm:inline">
                Foto{" "}
                {images.length > 0 &&
                  `(${images.length}/10)`}
              </span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-10"
              aria-label={t("post.addVideo", "Adicionar vídeo")}
              onClick={() =>
                videoRef.current?.click()
              }
              disabled={!!video}
            >
              <Video className="mr-1 h-4 w-4" />

              <span className="hidden sm:inline">
                Vídeo
              </span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-10"
              aria-label={t("post.openCamera", "Abrir câmera")}
              onClick={() =>
                setShowCamera(true)
              }
              disabled={images.length >= 10}
            >
              <Camera className="mr-1 h-4 w-4" />

              <span className="hidden sm:inline">
                Câmera
              </span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-10"
              aria-pressed={showLink}
              aria-label={t("post.addLink", "Adicionar link")}
              onClick={() =>
                setShowLink((value) => !value)
              }
            >
              <LinkIcon className="mr-1 h-4 w-4" />

              <span className="hidden sm:inline">
                Link
              </span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-10"
              aria-pressed={showLocation}
              aria-label={t("post.addLocation", "Adicionar localização")}
              onClick={() =>
                setShowLocation(
                  (value) => !value
                )
              }
            >
              <MapPin className="mr-1 h-4 w-4" />

              <span className="hidden sm:inline">
                Local
              </span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-10"
              aria-pressed={!!poll}
              aria-label={t("post.createPoll", "Criar enquete")}
              onClick={() =>
                setPoll(
                  poll
                    ? null
                    : {
                        question: "",
                        allow_multiple: false,
                        options: ["", ""],
                      }
                )
              }
            >
              <BarChart3 className="mr-1 h-4 w-4" />

              <span className="hidden sm:inline">
                Enquete
              </span>
            </Button>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Select
              value={privacy}
              onValueChange={(value) =>
                setPrivacy(
                  value as PostPrivacy
                )
              }
            >
              <SelectTrigger
                className="min-h-10 w-full sm:w-32"
                aria-label={t("post.privacy", "Privacidade da publicação")}
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {PRIVACY_OPTIONS.map(
                  (option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>

            <Button
              type="button"
              className="min-h-10 flex-1 sm:flex-none"
              disabled={
                !canPublish ||
                submitLockRef.current
              }
              onClick={handlePublish}
            >
              {(publish.isPending ||
                submitLockRef.current) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}

              {publish.isPending ||
              submitLockRef.current
                ? "Publicando…"
                : t("post.publish", "Publicar")}
            </Button>
          </div>
        </div>

        <p className="mt-1 text-right text-xs text-muted-foreground">
          JPG/PNG/WebP · até 10 fotos · vídeo até 100MB
        </p>
      </div>
    </>
  );
}

function PollEditor({
  poll,
  setPoll,
  onRemove,
  t,
}: {
  poll: PollDraft;
  setPoll: (poll: PollDraft) => void;
  onRemove: () => void;
  t: (key: string, fallback?: string) => string;
}) {
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Nova enquete
        </span>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label={t("post.removePoll", "Remover enquete")}
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Input
        placeholder={t("post.question", "Pergunta")}
        value={poll.question}
        onChange={(e) =>
          setPoll({
            ...poll,
            question: e.target.value,
          })
        }
      />

      {poll.options.map((option, index) => (
        <div
          key={index}
          className="flex gap-2"
        >
          <Input
            placeholder={t("post.option", `Opção ${index + 1}`)}
            value={option}
            onChange={(e) => {
              const next = [
                ...poll.options,
              ];

              next[index] =
                e.target.value;

              setPoll({
                ...poll,
                options: next,
              });
            }}
          />

          {poll.options.length > 2 && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() =>
                setPoll({
                  ...poll,
                  options:
                    poll.options.filter(
                      (_, i) =>
                        i !== index
                    ),
                })
              }
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}

      {poll.options.length < 6 && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            setPoll({
              ...poll,
              options: [
                ...poll.options,
                "",
              ],
            })
          }
        >
          <Plus className="mr-1 h-4 w-4" />
          Adicionar opção
        </Button>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={poll.allow_multiple}
          onChange={(e) =>
            setPoll({
              ...poll,
              allow_multiple:
                e.target.checked,
            })
          }
        />

        Permitir múltipla escolha
      </label>
    </div>
  );
}
