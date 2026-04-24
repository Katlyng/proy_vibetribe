import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { emailOTP } from "better-auth/plugins/email-otp";
import { Resend } from "@convex-dev/resend";

import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL || "http://localhost:3001";
const resend = new Resend(components.resend, { testMode: false });

export const authComponent = createClient<DataModel>(components.betterAuth);

function createAuth(ctx: GenericCtx<DataModel>) {
  return betterAuth({
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      },
    },
    plugins: [
      crossDomain({ siteUrl }),
      emailOTP({
        sendVerificationOnSignUp: true,
        async sendVerificationOTP({ email, otp, type }) {
          const otpTypeLabel =
            type === "forget-password"
              ? "recuperar tu contraseña"
              : type === "change-email"
              ? "cambiar tu correo"
              : type === "email-verification"
              ? "verificar tu correo"
              : "iniciar sesión";

          const subject = "Código de verificación de VibeTribe";
          const text = `Tu código para ${otpTypeLabel} es: ${otp}\n\nEste código expira en unos minutos. Si no solicitaste este código, ignora este mensaje.`;
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
              <h2 style="margin-bottom: 12px;">Código de verificación</h2>
              <p style="margin: 0 0 12px;">Usa este código para ${otpTypeLabel}:</p>
              <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.2em; margin: 0 0 16px;">${otp}</p>
              <p style="margin: 0; font-size: 14px; color: #475569;">Este código expira en unos minutos. Si no solicitaste este código, ignora este mensaje.</p>
            </div>
          `;

          await resend.sendEmail(ctx as any, {
            from: "VibeTribe <vibetribe@elcokiin.my>", 
            to: email,
            subject,
            text,
            html,
          });
        },
      }),
      convex({
        authConfig,
        jwksRotateOnTokenGenerationError: true,
      }),
    ],
  });
}

export { createAuth };

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.safeGetAuthUser(ctx);
  },
});
