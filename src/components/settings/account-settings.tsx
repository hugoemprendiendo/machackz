
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import React from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
} from "firebase/auth";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/firebase";
import { FirebaseError } from "firebase/app";

const accountFormSchema = z
  .object({
    email: z.string().email("Por favor ingresa un email válido."),
    currentPassword: z.string().min(1, "Tu contraseña actual es requerida para hacer cambios."),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword && data.newPassword.length < 6) {
        return false;
      }
      return true;
    },
    {
      message: "La nueva contraseña debe tener al menos 6 caracteres.",
      path: ["newPassword"],
    }
  )
  .refine(
    (data) => {
      if (data.newPassword && data.newPassword !== data.confirmPassword) {
        return false;
      }
      return true;
    },
    {
      message: "Las nuevas contraseñas no coinciden.",
      path: ["confirmPassword"],
    }
  );

type AccountFormValues = z.infer<typeof accountFormSchema>;

export function AccountSettings() {
  const { user } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
  });

  React.useEffect(() => {
    if (user?.email) {
      form.reset({ email: user.email });
    }
  }, [user, form]);

  const onSubmit = async (data: AccountFormValues) => {
    if (!user || !user.email) return;

    setIsSubmitting(true);
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      await reauthenticateWithCredential(user, credential);

      let changesMade = false;

      // Update password if a new one is provided
      if (data.newPassword) {
        await updatePassword(user, data.newPassword);
        changesMade = true;
        toast({
          title: "Contraseña Actualizada",
          description: "Tu contraseña ha sido cambiada exitosamente.",
        });
      }
      
      if (changesMade) {
        form.reset({
            ...form.getValues(),
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        });
      } else {
        toast({
            title: "Sin Cambios",
            description: "No has modificado ningún campo.",
        });
      }

    } catch (error) {
        let description = 'Ocurrió un error inesperado.';
        if (error instanceof FirebaseError) {
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                description = 'La contraseña actual es incorrecta.';
            } else if (error.code === 'auth/email-already-in-use') {
                description = 'El nuevo correo electrónico ya está en uso por otra cuenta.';
            }
        }
        console.error("Account update error:", error);
        toast({
            variant: "destructive",
            title: "Error al Actualizar",
            description,
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestionar Cuenta</CardTitle>
        <CardDescription>
          Actualiza tu contraseña. Para cambiar tu correo, utiliza la Consola de Firebase.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="account-settings-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input id="email" type="email" {...form.register("email")} readOnly className="cursor-not-allowed bg-muted/50"/>
            <p className="text-xs text-muted-foreground">Por razones de seguridad, el cambio de correo electrónico debe realizarse desde la Consola de Firebase.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Contraseña Actual (requerida para cambiar contraseña)</Label>
            <Input id="currentPassword" type="password" {...form.register("currentPassword")} />
            {form.formState.errors.currentPassword && (
              <p className="text-sm text-destructive">{form.formState.errors.currentPassword.message}</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Contraseña (opcional)</Label>
              <Input id="newPassword" type="password" {...form.register("newPassword")} />
              {form.formState.errors.newPassword && (
                <p className="text-sm text-destructive">{form.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
              <Input id="confirmPassword" type="password" {...form.register("confirmPassword")} />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>
          </div>
          
           <div className="flex justify-end">
             <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Save className="mr-2 h-4 w-4" />
                )}
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios de Cuenta'}
             </Button>
           </div>
        </form>
      </CardContent>
    </Card>
  );
}
