import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { privacySchema, type PrivacyValues } from "../schema";
import { updateProfile } from "../api";
import { profileKeys } from "../queries";
import type { Profile } from "../types";

const audienceOptions: Array<{
  value: PrivacyValues["quem_pode_amizade"];
  label: string;
}> = [
  { value: "todos", label: "Todos" },
  { value: "amigos", label: "Somente amigos" },
  { value: "ninguem", label: "Ninguém" },
];

function AudienceSelect({
  value,
  onChange,
}: {
  value: PrivacyValues["quem_pode_amizade"];
  onChange: (value: PrivacyValues["quem_pode_amizade"]) => void;
}) {
  const safeValue =
    value === "todos" || value === "amigos" || value === "ninguem"
      ? value
      : "todos";

  return (
    <Select
      value={safeValue}
      onValueChange={(nextValue) =>
        onChange(nextValue as PrivacyValues["quem_pode_amizade"])
      }
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        {audienceOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function PrivacySettingsForm({ profile }: { profile: Profile }) {
  const qc = useQueryClient();

  const form = useForm<PrivacyValues>({
    resolver: zodResolver(privacySchema),
    defaultValues: {
      perfil_publico: profile.perfil_publico,
      quem_pode_amizade: profile.quem_pode_amizade,
      quem_pode_seguir: profile.quem_pode_seguir,
      quem_pode_mensagem: profile.quem_pode_mensagem,
    },
  });

  useEffect(() => {
    form.reset({
      perfil_publico: profile.perfil_publico,
      quem_pode_amizade: profile.quem_pode_amizade,
      quem_pode_seguir: profile.quem_pode_seguir,
      quem_pode_mensagem: profile.quem_pode_mensagem,
    });
  }, [
    profile.id,
    profile.perfil_publico,
    profile.quem_pode_amizade,
    profile.quem_pode_seguir,
    profile.quem_pode_mensagem,
    form,
  ]);

  const save = useMutation({
    mutationFn: async (values: PrivacyValues) => {
      console.log("[PrivacySettingsForm] Salvando privacidade:", {
        profileId: profile.id,
        values,
      });

      const updated = await updateProfile(profile.id, {
        perfil_publico: values.perfil_publico,
        quem_pode_amizade: values.quem_pode_amizade,
        quem_pode_seguir: values.quem_pode_seguir,
        quem_pode_mensagem: values.quem_pode_mensagem,
      });

      console.log("[PrivacySettingsForm] Privacidade salva:", {
        profileId: updated.id,
        perfil_publico: updated.perfil_publico,
        quem_pode_amizade: updated.quem_pode_amizade,
        quem_pode_seguir: updated.quem_pode_seguir,
        quem_pode_mensagem: updated.quem_pode_mensagem,
      });

      return updated;
    },

    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: profileKeys.all });
      await qc.refetchQueries({ queryKey: profileKeys.all });

      toast.success("Privacidade atualizada");
    },

    onError: (error: Error) => {
      console.error("[PrivacySettingsForm] Erro ao salvar privacidade:", error);
      toast.error(`Não foi possível salvar: ${error.message}`);
    },
  });

  function onSubmit(values: PrivacyValues) {
    save.mutate(values);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <FormField
          control={form.control}
          name="perfil_publico"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-4">
              <div className="space-y-0.5">
                <FormLabel>Perfil público</FormLabel>

                <FormDescription>
                  Quando desativado, apenas você vê seu perfil.
                </FormDescription>
              </div>

              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quem_pode_amizade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Quem pode enviar solicitação de amizade
              </FormLabel>

              <FormControl>
                <AudienceSelect
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quem_pode_seguir"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quem pode seguir</FormLabel>

              <FormControl>
                <AudienceSelect
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quem_pode_mensagem"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quem pode enviar mensagem</FormLabel>

              <FormControl>
                <AudienceSelect
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={save.isPending}>
          {save.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}

          {save.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </form>
    </Form>
  );
}
