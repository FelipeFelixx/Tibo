import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { profileEditSchema, type ProfileEditValues } from "../schema";
import { updateProfile, getMyProfile } from "../api";
import { profileKeys } from "../queries";
import type { Profile } from "../types";
import { ImageUploader } from "./ImageUploader";
import { SignedImage } from "./SignedImage";
import { SignedAvatarImage } from "./SignedAvatarImage";

export function EditProfileForm({ profile }: { profile: Profile }) {
  const qc = useQueryClient();
  const [avatarPath, setAvatarPath] = useState<string | null>(profile.avatar_url);
  const [coverPath, setCoverPath] = useState<string | null>(profile.cover_url);

  const form = useForm<ProfileEditValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      nome: profile.nome ?? "",
      sobrenome: profile.sobrenome ?? "",
      username: profile.username,
      bio: profile.bio ?? "",
      cidade: profile.cidade ?? "",
      estado: profile.estado ?? "",
      pais: profile.pais ?? "",
      site: profile.site ?? "",
    },
  });

  const save = useMutation({
    mutationFn: async (values: ProfileEditValues) => {
      const currentProfile = await getMyProfile();

      if (!currentProfile) {
        throw new Error("Não foi possível encontrar seu perfil. Faça login novamente.");
      }

      return updateProfile(currentProfile.id, {
        nome: values.nome.trim(),
        sobrenome: values.sobrenome?.trim() || null,
        username: values.username.trim(),
        bio: values.bio?.trim() || null,
        cidade: values.cidade?.trim() || null,
        estado: values.estado?.trim() || null,
        pais: values.pais?.trim() || null,
        site: values.site?.trim() || null,
        avatar_url: avatarPath,
        cover_url: coverPath,
      });
    },

    onSuccess: (updatedProfile) => {
      qc.setQueryData(profileKeys.me(), updatedProfile);
      qc.invalidateQueries({ queryKey: profileKeys.all });

      form.reset({
        nome: updatedProfile.nome ?? "",
        sobrenome: updatedProfile.sobrenome ?? "",
        username: updatedProfile.username,
        bio: updatedProfile.bio ?? "",
        cidade: updatedProfile.cidade ?? "",
        estado: updatedProfile.estado ?? "",
        pais: updatedProfile.pais ?? "",
        site: updatedProfile.site ?? "",
      });

      toast.success("Perfil atualizado com sucesso!");
    },

    onError: (error: unknown) => {
      console.error("Erro ao salvar perfil:", error);

      if (error instanceof Error) {
        toast.error(`Não foi possível salvar o perfil: ${error.message}`);
      } else {
        toast.error("Não foi possível salvar o perfil. Tente novamente.");
      }
    },
  });

  async function handleAvatarChange(path: string | null) {
    try {
      setAvatarPath(path);

      const currentProfile = await getMyProfile();

      if (!currentProfile) {
        throw new Error("Não foi possível encontrar seu perfil.");
      }

      await updateProfile(currentProfile.id, {
        avatar_url: path,
      });

      await qc.invalidateQueries({ queryKey: profileKeys.all });
      await qc.invalidateQueries({ queryKey: profileKeys.me() });

      toast.success("Foto de perfil atualizada!");
    } catch (error) {
      console.error("Erro ao atualizar avatar:", error);

      setAvatarPath(profile.avatar_url);

      toast.error(
        error instanceof Error
          ? `Não foi possível salvar a foto: ${error.message}`
          : "Não foi possível salvar a foto.",
      );
    }
  }

  async function handleCoverChange(path: string | null) {
    try {
      setCoverPath(path);

      const currentProfile = await getMyProfile();

      if (!currentProfile) {
        throw new Error("Não foi possível encontrar seu perfil.");
      }

      await updateProfile(currentProfile.id, {
        cover_url: path,
      });

      await qc.invalidateQueries({ queryKey: profileKeys.all });
      await qc.invalidateQueries({ queryKey: profileKeys.me() });

      toast.success("Foto de capa atualizada!");
    } catch (error) {
      console.error("Erro ao atualizar capa:", error);

      setCoverPath(profile.cover_url);

      toast.error(
        error instanceof Error
          ? `Não foi possível salvar a capa: ${error.message}`
          : "Não foi possível salvar a capa.",
      );
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Foto de capa</h2>

          <div className="mt-2 h-40 w-full overflow-hidden rounded-xl bg-muted">
            <SignedImage
              bucket="covers"
              path={coverPath}
              alt="Capa"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <ImageUploader
          bucket="covers"
          userId={profile.id}
          currentPath={coverPath}
          onChange={handleCoverChange}
          label="Capa"
        />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Foto de perfil</h2>

        <div className="flex items-center gap-4">
          <Avatar className="h-24 w-24">
            <SignedAvatarImage
              bucket="avatars"
              path={avatarPath}
              alt="Avatar"
              className="h-full w-full object-cover"
            />

            <AvatarFallback>
              {profile.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <ImageUploader
            bucket="avatars"
            userId={profile.id}
            currentPath={avatarPath}
            onChange={handleAvatarChange}
            label="Avatar"
          />
        </div>
      </section>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(
            (values) => save.mutate(values),
            () => {
              toast.error("Verifique os campos destacados antes de salvar.");
            },
          )}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sobrenome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sobrenome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="cidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pais"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>País</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="site"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Site</FormLabel>
                <FormControl>
                  <Input placeholder="https://" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={save.isPending}>
            {save.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {save.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </Form>
    </div>
  );
}