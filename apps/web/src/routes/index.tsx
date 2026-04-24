import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@proy_vibetribe/ui/components/button";

export const Route = createFileRoute("/")({
  component: WelcomeScreen,
});

function WelcomeScreen() {
  return (
    <div className="relative min-h-screen bg-background flex flex-col justify-between md:max-w-md mx-auto overflow-hidden">
      {/* Hero Section with Image and Gradient Overlay */}
      <div className="relative h-96 w-full">
        <img
          src="/images/welcome-hero.png"
          alt="Welcome Hero"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient Overlay using CSS in web */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-background" />

        {/* Logo Centered on Hero */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src="/brand/logomark.png"
            alt="VibeTribe logomark"
            className="w-[120px] h-[120px] object-contain drop-shadow-md"
          />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-6 px-6 pb-12 pt-4 bg-background relative z-10">
        {/* Wordmark Logo */}
        <div className="flex justify-center">
          <img
            src="/brand/wordmark.png"
            alt="VibeTribe wordmark"
            className="w-[200px] h-[60px] object-contain"
          />
        </div>

        {/* App Tagline */}
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold text-center tracking-tight">¡Bienvenido!</h1>
          <p className="text-muted-foreground text-center leading-relaxed">
            Conecta con personas con tus mismos intereses y disfruta de experiencias únicas juntos.
          </p>
        </div>

        {/* Begin Button */}
        <Link to="/dashboard" search={{ login: "true" }} className="w-full mt-4">
          <Button size="lg" className="w-full rounded-2xl h-14 text-base font-semibold shadow-lg">
            Comenzar
          </Button>
        </Link>
      </div>
    </div>
  );
}
