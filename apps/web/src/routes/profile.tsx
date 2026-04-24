import { api } from "@proy_vibetribe/backend/convex/_generated/api";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  User as UserIcon,
  MapPin,
  Star,
  Settings,
  LogOut,
  Package,
  Luggage,
  Heart,
  ChevronRight,
  ShieldCheck,
  Bell,
  Camera,
  X,
  Save,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@proy_vibetribe/ui/components/avatar";
import { Button } from "@proy_vibetribe/ui/components/button";
import { Skeleton } from "@proy_vibetribe/ui/components/skeleton";
import { Input } from "@proy_vibetribe/ui/components/input";
import { Label } from "@proy_vibetribe/ui/components/label";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/profile")({
  component: ProfileScreen,
});

function ProfileScreen() {
  const profile = useQuery(api.profiles.getMine);
  const updateProfile = useMutation(api.profiles.updateMine);

  const [isEditing, setIsEditing] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [favoritesDraft, setFavoritesDraft] = useState("");
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSignOut = async () => {
    window.location.href = "/";
  };

  const handleEditClick = () => {
    setDescriptionDraft((profile as any).description || "");
    setFavoritesDraft(((profile as any).favoriteDestinations || []).join(", "));
    setAvatarDraft(profile?.avatarUrl || null);
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const favoriteDestinations = favoritesDraft
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      await updateProfile({
        description: descriptionDraft.trim(),
        favoriteDestinations,
        avatarUrl: avatarDraft || undefined,
      });
      toast.success("Perfil actualizado correctamente");
      setIsEditing(false);
    } catch (error) {
      toast.error("Ocurrió un error al guardar el perfil");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen no debe superar los 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      
      // Optional: Compress image using canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        setAvatarDraft(compressedBase64);
      };
      img.src = base64String;
    };
    reader.readAsDataURL(file);
  };

  if (profile === undefined) {
    return <ProfileSkeleton />;
  }

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Perfil no encontrado.</p>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="flex-1 w-full max-w-md mx-auto md:max-w-2xl bg-muted/20 border-x min-h-screen pb-20">
        <PageHeader title="Editar Perfil" backTo="/profile" />
        <div className="px-5 py-6 flex flex-col gap-5">

          <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Avatar className="h-20 w-20 border-2 border-background shadow-sm">
                  <AvatarImage src={avatarDraft || profile.avatarUrl || undefined} alt={profile.name || "Explorer"} />
                  <AvatarFallback className="text-2xl bg-secondary text-secondary-foreground font-bold">
                    {(profile.name || "E")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate">{profile.name || "Tu Nombre"}</h3>
                <p className="text-muted-foreground text-sm truncate">{profile.email || "-"}</p>
                <p className="text-xs text-indigo-600 font-medium cursor-pointer mt-1" onClick={() => fileInputRef.current?.click()}>
                  Cambiar foto
                </p>
              </div>
            </div>

            <div className="space-y-2 mt-2">
              <Label>Descripción</Label>
              <textarea 
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                placeholder="Cuéntanos sobre tu estilo de viaje..."
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Destinos Favoritos</Label>
              <Input 
                value={favoritesDraft}
                onChange={(e) => setFavoritesDraft(e.target.value)}
                placeholder="Ej: Kyoto, Cusco, Cartagena"
              />
              <p className="text-xs text-muted-foreground">Sepáralos con comas.</p>
            </div>

            <Button 
              className="w-full mt-4 flex items-center gap-2" 
              onClick={handleSaveProfile}
              disabled={isSaving}
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-md mx-auto md:max-w-2xl bg-muted/20 border-x min-h-screen pb-20">
      <PageHeader title="Mi Perfil" backTo="/dashboard" />
      <div className="px-5 py-6 flex flex-col gap-6">
        
        {/* Header Profile */}
        <section className="flex flex-col items-center justify-center p-6 bg-card border rounded-2xl shadow-sm text-center">
          <Avatar className="h-24 w-24 border-4 border-background shadow-md mb-4">
            <AvatarImage src={profile.avatarUrl || undefined} alt={profile.name || "Explorer"} />
            <AvatarFallback className="text-3xl bg-secondary text-secondary-foreground font-bold">
              {(profile.name || "E")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <h1 className="text-2xl font-bold text-foreground">
            {profile.name || "Tu Nombre"}
          </h1>
          <p className="text-muted-foreground text-sm flex items-center justify-center gap-1 mt-1">
            <MapPin className="h-4 w-4" />
            {(profile as any).description || "Amante de las aventuras y la naturaleza"}
          </p>

          <div className="flex items-center gap-4 mt-6 w-full justify-center divide-x">
            <div className="flex flex-col items-center px-4">
              <span className="text-sm text-muted-foreground">Revisión</span>
              <div className="flex items-center text-amber-500 font-bold mt-1 gap-1">
                {profile.averageRating?.toFixed(1) || "5.0"}
                <Star className="h-4 w-4 fill-amber-500" />
              </div>
            </div>
            
            <div className="flex flex-col items-center px-4">
              <span className="text-sm text-muted-foreground">Viajes</span>
              <div className="flex items-center font-bold mt-1 gap-1 text-foreground">
                {(profile as any).totalRatings || "0"}
                <Luggage className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>
        </section>

        {/* Activities and Stats */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-foreground px-1">Tu Actividad</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 bg-card rounded-xl">
              <Package className="h-6 w-6 text-primary" />
              <span className="font-semibold text-sm">Mis Viajes</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 bg-card rounded-xl">
              <Heart className="h-6 w-6 text-destructive" />
              <span className="font-semibold text-sm">Guardados</span>
            </Button>
          </div>
        </section>

        {/* Options List */}
        <section className="flex flex-col gap-2 mt-2">
          <h2 className="text-lg font-bold text-foreground px-1 mb-1">Configuración</h2>
          
          <div className="bg-card border rounded-2xl overflow-hidden divide-y">
            <button 
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
              onClick={handleEditClick}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
                  <UserIcon className="h-5 w-5" />
                </div>
                <span className="font-medium">Editar Perfil</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600 dark:text-purple-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="font-medium">Privacidad y Seguridad</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-600 dark:text-orange-400">
                  <Bell className="h-5 w-5" />
                </div>
                <span className="font-medium">Notificaciones</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
            
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-500/10 rounded-lg text-gray-600 dark:text-gray-400">
                  <Settings className="h-5 w-5" />
                </div>
                <span className="font-medium">Preferencias</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </section>

        {/* Global Actions */}
        <section className="mt-4 pt-4 border-t flex flex-col gap-3">
          <Button 
            variant="destructive" 
            className="w-full rounded-xl py-6 flex items-center gap-2 font-bold" 
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            Cerrar Sesión
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            VibeTribe v1.0.0
          </p>
        </section>

      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex-1 w-full max-w-md mx-auto md:max-w-2xl bg-muted/20 border-x min-h-screen pb-20">
      <div className="px-5 py-8 flex flex-col gap-6 animate-pulse">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl mt-4" />
      </div>
    </div>
  );
}