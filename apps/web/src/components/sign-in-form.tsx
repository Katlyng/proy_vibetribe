import { useState, useEffect } from "react";
import { Button } from "@proy_vibetribe/ui/components/button";
import { Input } from "@proy_vibetribe/ui/components/input";
import { Label } from "@proy_vibetribe/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

export default function SignInForm({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) {
  const navigate = useNavigate({
    from: "/",
  });

  const [step, setStep] = useState<"login" | "forgot-password" | "reset-password" | "verify-email">(
    () => (localStorage.getItem("auth-step") as any) || "login"
  );
  const [resetEmail, setResetEmail] = useState(
    () => localStorage.getItem("auth-resetEmail") || ""
  );
  const [verificationEmail, setVerificationEmail] = useState(
    () => localStorage.getItem("auth-verificationEmail") || ""
  );
  const [verificationPassword, setVerificationPassword] = useState(
    () => localStorage.getItem("auth-verificationPassword") || ""
  );

  // Persistir en localStorage para que no se pierda al cambiar de app en celulares
  useEffect(() => {
    localStorage.setItem("auth-step", step);
  }, [step]);
  useEffect(() => {
    localStorage.setItem("auth-resetEmail", resetEmail);
  }, [resetEmail]);
  useEffect(() => {
    localStorage.setItem("auth-verificationEmail", verificationEmail);
  }, [verificationEmail]);
  useEffect(() => {
    localStorage.setItem("auth-verificationPassword", verificationPassword);
  }, [verificationPassword]);

  // Limpiar credenciales
  const clearAuthCache = () => {
    localStorage.removeItem("auth-step");
    localStorage.removeItem("auth-resetEmail");
    localStorage.removeItem("auth-verificationEmail");
    localStorage.removeItem("auth-verificationPassword");
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
      await (authClient as any).emailOtp.verifyEmail(
        {
          email: verificationEmail,
          otp: value.otp.trim(),
        },
        {
          async onSuccess() {
            toast.success("Correo verificado correctamente.");
            
            if (verificationPassword) {
              await authClient.signIn.email(
                {
                  email: verificationEmail,
                  password: verificationPassword,
                },
                {
                  onSuccess() {
                    clearAuthCache();
                    navigate({ to: "/dashboard" });
                  },
                  onError(error: any) {
                    toast.error(error.error?.message || "Inicia sesión para continuar");
                    setStep("login");
                  }
                }
              );
            } else {
              setStep("login");
              toast.info("Por favor inicia sesión ahora.");
            }
          },
          onError(error: any) {
            toast.error(error.error?.message || "Código incorrecto. Intenta de nuevo.");
          }
        }
      );
    }
  });

  const resetForm = useForm({
    defaultValues: { email: "" },
    validators: { onSubmit: z.object({ email: z.email("Invalid email") }) },
    onSubmit: async ({ value }) => {
      const res = await (authClient as any).emailOtp.sendVerificationOtp({ email: value.email, type: "forget-password" });
      if (res.error) {
        toast.error("Error enviando código. Verifica tu conexión.");
      } else {
        setResetEmail(value.email);
        setStep("reset-password");
        toast.success(`Código enviado a ${value.email}`);
      }
    },
  });

  const newPasswordForm = useForm({
    defaultValues: { otp: "", newPassword: "", confirmPassword: "" },
    validators: {
      onSubmit: z.object({
        otp: z.string().length(6, "OTP must be 6 digits"),
        newPassword: z.string().min(8, "Min 8 characters"),
        confirmPassword: z.string()
      }).refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      })
    },
    onSubmit: async ({ value }) => {
      await (authClient as any).emailOtp.resetPassword(
        { email: resetEmail, otp: value.otp, password: value.newPassword },
        {
          onSuccess() {
            toast.success("Contraseña actualizada. Inicia sesión.");
            setStep("login");
            newPasswordForm.reset();
          },
          onError(e: any) {
            toast.error(e.error?.message || "Código incorrecto");
          }
        }
      );
    }
  });

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            clearAuthCache();
            navigate({
              to: "/dashboard",
            });
            toast.success("Sign in successful");
          },
          onError: async (error: any) => {
            if (error.error?.code === "EMAIL_NOT_VERIFIED") {
               toast.info("Debes verificar tu correo.");
               setVerificationEmail(value.email);
               setVerificationPassword(value.password);
               setStep("verify-email");
               await (authClient as any).emailOtp.sendVerificationOtp({
                 email: value.email,
                 type: "email-verification"
               });
               toast.success("Te enviamos un código de verificación.");
            } else {
               toast.error(error.error?.message || error.error?.statusText || "Ocurrió un error.");
            }
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.string().trim().min(1, "El correo electrónico es requerido").email("Ingresa un correo electrónico válido"),
        password: z.string().min(1, "La contraseña es requerida").min(8, "Usa al menos 8 caracteres"),
      }),
    },
  });

  if (step === "verify-email") {
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
            Ingresa el código de 6 dígitos que enviamos a <strong>{verificationEmail}</strong>
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
                email: verificationEmail,
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
            onClick={() => {
              clearAuthCache();
              setStep("login");
            }}
            className="font-medium text-sm text-muted-foreground hover:text-foreground mt-4"
          >
            Volver a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  if (step === "forgot-password") {
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
          <h1 className="text-2xl font-bold tracking-tight">Recuperar contraseña</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Ingresa tu correo para recibir un código de recuperación.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            resetForm.handleSubmit();
          }}
          className="space-y-4 w-full"
        >
          <div>
            <resetForm.Field name="email">
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
            </resetForm.Field>
          </div>

          <resetForm.Subscribe selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}>
            {({ canSubmit, isSubmitting }) => (
              <Button type="submit" className="w-full mt-2" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Enviando..." : "Enviar código"}
              </Button>
            )}
          </resetForm.Subscribe>

          <div className="text-center mt-4">
             <button type="button" onClick={() => setStep("login")} className="font-medium text-sm text-indigo-600 hover:text-indigo-800 hover:underline">Volver a inicio de sesión</button>
          </div>
        </form>
      </div>
    );
  }

  if (step === "reset-password") {
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
          <h1 className="text-2xl font-bold tracking-tight">Nueva contraseña</h1>
          <p className="text-muted-foreground text-sm mt-2">
             Ingresa el código e introduce tu nueva contraseña
          </p>
        </div>
        
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            newPasswordForm.handleSubmit();
          }}
          className="space-y-4 w-full"
        >
          <div>
            <newPasswordForm.Field name="otp">
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
                    className={`text-center tracking-widest text-2xl h-12 ${field.state.meta.errors.length ? "border-destructive" : ""}`}
                  />
                  {field.state.meta.errors.map((error, index) => (
                   <p key={`${field.name}-error-${index}`} className="text-destructive text-xs">
                     {error?.message}
                   </p>
                 ))}
                </div>
              )}
            </newPasswordForm.Field>
          </div>

          <div>
            <newPasswordForm.Field name="newPassword">
              {(field) => (
                <div className="space-y-1">
                  <Label htmlFor={field.name}>Nueva contraseña</Label>
                  <Input id={field.name} name={field.name} type="password" placeholder="••••••••" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className={field.state.meta.errors.length ? "border-destructive" : ""} />
                 {field.state.meta.errors.map((error, index) => (
                   <p key={`${field.name}-error-${index}`} className="text-destructive text-xs">
                     {error?.message}
                   </p>
                 ))}
                </div>
              )}
            </newPasswordForm.Field>
          </div>

          <div>
            <newPasswordForm.Field name="confirmPassword">
              {(field) => (
                <div className="space-y-1">
                  <Label htmlFor={field.name}>Confirmar contraseña</Label>
                  <Input id={field.name} name={field.name} type="password" placeholder="••••••••" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className={field.state.meta.errors.length ? "border-destructive" : ""} />
                  {field.state.meta.errors.map((error, index) => (
                   <p key={`${field.name}-error-${index}`} className="text-destructive text-xs">
                     {error?.message}
                   </p>
                  ))}
                  <p className="text-destructive text-xs">{field.state.meta.errors.map(e => e?.message)}</p>
                </div>
              )}
            </newPasswordForm.Field>
          </div>

          <newPasswordForm.Subscribe selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}>
            {({ canSubmit, isSubmitting }) => (
              <Button type="submit" className="w-full mt-2" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Restableciendo..." : "Restablecer contraseña"}
              </Button>
            )}
          </newPasswordForm.Subscribe>
          
          <div className="text-center mt-4">
             <button type="button" onClick={() => setStep("login")} className="font-medium text-sm text-indigo-600 hover:text-indigo-800 hover:underline">Cancelar</button>
          </div>
        </form>
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
        <h1 className="text-2xl font-bold tracking-tight">Bienvenido de nuevo</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Inicia sesión para continuar a tu panel.
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

        <form.Subscribe
          selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button type="submit" className="w-full mt-1" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Iniciando..." : "Iniciar Sesión"}
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
            <button
              type="button"
              className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
              onClick={() => setStep("forgot-password")}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </p>

          <p className="text-sm text-muted-foreground">
            ¿No tienes una cuenta?{" "}
            <button
              type="button"
              onClick={onSwitchToSignUp}
              className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
               Crea una
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}
