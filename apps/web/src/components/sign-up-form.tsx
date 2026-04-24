import { useState, useEffect } from "react";
import { Button } from "@proy_vibetribe/ui/components/button";
import { Input } from "@proy_vibetribe/ui/components/input";
import { Label } from "@proy_vibetribe/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

export default function SignUpForm({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const navigate = useNavigate({
    from: "/",
  });

  const [verificationData, setVerificationData] = useState<{ email: string; password?: string } | null>(
    () => {
      const stored = localStorage.getItem("signUp-verificationData");
      return stored ? JSON.parse(stored) : null;
    }
  );

  useEffect(() => {
    if (verificationData) {
      localStorage.setItem("signUp-verificationData", JSON.stringify(verificationData));
    } else {
      localStorage.removeItem("signUp-verificationData");
    }
  }, [verificationData]);

  const clearSignUpCache = () => {
    localStorage.removeItem("signUp-verificationData");
    setVerificationData(null);
  };

  const otpForm = useForm({
    defaultValues: {
      otp: "",
    },
    validators: {
      onSubmit: z.object({
        otp: z.string().length(6, "OTP must be 6 digits"),
      }),
    },
    onSubmit: async ({ value }) => {
      if (!verificationData) return;

      await (authClient as any).emailOtp.verifyEmail(
        {
          email: verificationData.email,
          otp: value.otp.trim(),
        },
        {
          async onSuccess() {
            toast.success("Correo verificado correctamente.");
            
            if (verificationData.password) {
              await authClient.signIn.email(
                {
                  email: verificationData.email,
                  password: verificationData.password,
                },
                {
                  onSuccess() {
                    clearSignUpCache();
                    navigate({ to: "/dashboard" });
                  },
                  onError(error: any) {
                    clearSignUpCache();
                    toast.error(error.error?.message || "Inicia sesión para continuar");
                    onSwitchToSignIn();
                  }
                }
              );
            } else {
              clearSignUpCache();
              navigate({ to: "/dashboard" });
            }
          },
          onError(error: any) {
            toast.error(error.error?.message || "Código incorrecto. Intenta de nuevo.");
          }
        }
      );
    }
  });

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          email: value.email,
          password: value.password,
          name: value.name,
        },
        {
          onSuccess: () => {
            setVerificationData({ email: value.email, password: value.password });
            toast.success("Te enviamos un código de verificación a tu correo.");
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
        email: z.string().trim().min(1, "El correo electrónico es requerido").email("Ingresa un correo electrónico válido"),
        password: z.string().min(1, "La contraseña es requerida").min(8, "Usa al menos 8 caracteres"),
        confirmPassword: z.string(),
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Las contraseñas no coinciden",
        path: ["confirmPassword"],
      }),
    },
  });

  if (verificationData) {
    return (
      <div className="mx-auto w-full mt-10 max-w-sm p-6 justify-center flex flex-col items-center">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/brand/logomark.png"
              alt="VibeTribe logomark"
              className="w-[46px] h-[46px] object-contain"
            />
            <img
              src="/brand/wordmark.png"
              alt="VibeTribe wordmark"
              className="w-[172px] h-[36px] object-contain"
            />
          </div>
          <p className="text-muted-foreground text-sm">
            tu vibra es tu pasaporte
          </p>
        </div>

        <div className="w-full text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Verifica tu correo</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Ingresa el código de 6 dígitos que enviamos a <strong>{verificationData.email}</strong>
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            otpForm.handleSubmit();
          }}
          className="space-y-4 w-full"
        >
          <div>
            <otpForm.Field name="otp">
              {(field) => (
                <div className="space-y-1">
                  <Label htmlFor={field.name}>Código de verificación</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="123456"
                    maxLength={6}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className={`text-center text-2xl tracking-widest h-12 ${field.state.meta.errors.length ? "border-destructive" : ""}`}
                  />
                  {field.state.meta.errors.map((error, index) => (
                    <p key={`${field.name}-error-${index}`} className="text-destructive text-sm">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </otpForm.Field>
          </div>

          <otpForm.Subscribe
            selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
          >
            {({ canSubmit, isSubmitting }) => (
              <Button type="submit" className="w-full mt-2 h-12" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Verificando..." : "Verificar correo"}
              </Button>
            )}
          </otpForm.Subscribe>
        </form>

        <div className="mt-6 text-center flex flex-col gap-2">
          <button
            type="button"
            onClick={async () => {
              await (authClient as any).emailOtp.sendVerificationOtp({
                email: verificationData.email,
                type: "email-verification"
              });
              toast.success("Código reenviado.");
            }}
            className="font-medium text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            ¿No recibiste el código? Reenviar
          </button>

          <button
            type="button"
            onClick={clearSignUpCache}
            className="font-medium text-sm text-muted-foreground hover:text-foreground mt-4"
          >
            Atrás
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full mt-10 max-w-sm p-6 justify-center flex flex-col items-center">
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <img
            src="/brand/logomark.png"
            alt="VibeTribe logomark"
            className="w-[46px] h-[46px] object-contain"
          />
          <img
            src="/brand/wordmark.png"
            alt="VibeTribe wordmark"
            className="w-[172px] h-[36px] object-contain"
          />
        </div>
        <p className="text-muted-foreground text-sm">
          tu vibra es tu pasaporte
        </p>
      </div>

      <div className="w-full text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Crear Cuenta</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Regístrate para empezar tu viaje.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4 w-full"
      >
        <div>
          <form.Field name="name">
            {(field) => (
               <div className="space-y-1">
                 <Label htmlFor={field.name}>Nombre</Label>
                 <Input
                   id={field.name}
                   name={field.name}
                   placeholder="Juan Pérez"
                   value={field.state.value}
                   onBlur={field.handleBlur}
                   onChange={(e) => field.handleChange(e.target.value)}
                   className={field.state.meta.errors.length ? "border-destructive" : ""}
                 />
                 {field.state.meta.errors.map((error, index) => (
                   <p key={`${field.name}-error-${index}`} className="text-destructive text-xs">
                     {error?.message}
                   </p>
                 ))}
               </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="email">
            {(field) => (
               <div className="space-y-1">
                 <Label htmlFor={field.name}>Correo electrónico</Label>
                 <Input
                   id={field.name}
                   name={field.name}
                   type="email"
                   placeholder="correo@ejemplo.com"
                   value={field.state.value}
                   onBlur={field.handleBlur}
                   onChange={(e) => field.handleChange(e.target.value)}
                   className={field.state.meta.errors.length ? "border-destructive" : ""}
                 />
                 {field.state.meta.errors.map((error, index) => (
                   <p key={`${field.name}-error-${index}`} className="text-destructive text-xs">
                     {error?.message}
                   </p>
                 ))}
               </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="password">
            {(field) => (
               <div className="space-y-1">
                 <Label htmlFor={field.name}>Contraseña</Label>
                 <Input
                   id={field.name}
                   name={field.name}
                   type="password"
                   placeholder="••••••••"
                   value={field.state.value}
                   onBlur={field.handleBlur}
                   onChange={(e) => field.handleChange(e.target.value)}
                   className={field.state.meta.errors.length ? "border-destructive" : ""}
                 />
                 {field.state.meta.errors.map((error, index) => (
                   <p key={`${field.name}-error-${index}`} className="text-destructive text-xs">
                     {error?.message}
                   </p>
                 ))}
               </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="confirmPassword">
            {(field) => (
               <div className="space-y-1">
                 <Label htmlFor={field.name}>Confirmar contraseña</Label>
                 <Input
                   id={field.name}
                   name={field.name}
                   type="password"
                   placeholder="••••••••"
                   value={field.state.value}
                   onBlur={field.handleBlur}
                   onChange={(e) => field.handleChange(e.target.value)}
                   className={field.form.state.errors.length ? "border-destructive" : ""}
                 />
                 {field.form.state.errors.map((error, index) => (
                   <p key={`${field.name}-form-error-${index}`} className="text-destructive text-xs">
                     {typeof error === "string" ? error : (error as any)?.message}
                   </p>
                 ))}
               </div>
            )}
          </form.Field>
        </div>

        <form.Subscribe
          selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button type="submit" className="w-full mt-1" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Registrando..." : "Registrarse"}
            </Button>
          )}
        </form.Subscribe>

        <Button 
          variant="outline" 
          className="w-full" 
          type="button"
          onClick={() => authClient.signIn.social({ provider: "google" })}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" className="mr-2 h-4 w-4">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continuar con Google
        </Button>

        <div className="mt-4 gap-2 flex flex-col text-center">
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes una cuenta?{" "}
            <button
              type="button"
              onClick={onSwitchToSignIn}
              className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
               Iniciar Sesión
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}
