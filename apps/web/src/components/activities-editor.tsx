import { api } from "@proy_vibetribe/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState, useRef } from "react";
import { Plus, Pencil, Trash2, Camera, X, Check, MapPin, Map, Calendar, DollarSign, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@proy_vibetribe/ui/components/button";
import { Input } from "@proy_vibetribe/ui/components/input";
import { Label } from "@proy_vibetribe/ui/components/label";
import { Textarea } from "@proy_vibetribe/ui/components/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@proy_vibetribe/ui/components/dialog";
import { Separator } from "@proy_vibetribe/ui/components/separator";
import { Checkbox } from "@proy_vibetribe/ui/components/checkbox";
import { LocationInput } from "@/components/location-input";
import { getGoogleMapsApiKey } from "@/lib/maps";

export function ActivitiesEditor({ packageId }: { packageId: any }) {
  const pkg = useQuery(api.packages.getById, { id: packageId });
  const addMutation = useMutation(api.packages.addActivity);
  const updateMutation = useMutation(api.packages.updateActivity);
  const removeMutation = useMutation(api.packages.removeActivity);
  const updatePackageMutation = useMutation(api.packages.update);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    dateStr: "",
    location: "",
    duration: "1 día",
    isIncluded: true,
    cost: 0,
    imageUrl: null as string | null,
    accommodation: "",
    increasePackagePrice: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!pkg || !pkg.activities) return null;

  const activities = [...pkg.activities].sort((a, b) => a.date - b.date);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      dateStr: pkg.startDate ? format(new Date(pkg.startDate), "yyyy-MM-dd") : "",
      location: "",
      duration: "1 día",
      isIncluded: true,
      cost: 0,
      imageUrl: null,
      accommodation: "",
      increasePackagePrice: false,
    });
    setEditingId(null);
    setShowAdvanced(false);
  };

  const handleEdit = (act: any) => {
    setForm({
      title: act.title,
      description: act.description,
      dateStr: act.date ? format(new Date(act.date), "yyyy-MM-dd") : "",
      location: act.location,
      duration: act.duration,
      isIncluded: act.isIncluded,
      cost: act.cost || 0,
      imageUrl: act.imageUrl || null,
      accommodation: act.accommodation || "",
      increasePackagePrice: false,
    });
    setEditingId(act._id);
    setShowAdvanced(!!act.accommodation || (!act.isIncluded && (act.cost || 0) > 0));
    setIsDialogOpen(true);
  };

  const handleDelete = async (actId: string) => {
    if (confirm("¿Estás seguro de eliminar esta parada?")) {
      try {
        await removeMutation({ activityId: actId as any });
        toast.success("Parada eliminada");
      } catch (e: any) {
        toast.error("Error al eliminar");
      }
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.location) {
      toast.error("Completa título y ubicación");
      return;
    }
    setLoading(true);
    try {
      if (form.dateStr && pkg.startDate && pkg.endDate) {
        const startOfDay = new Date(pkg.startDate).setHours(0,0,0,0);
        const endOfDay = new Date(pkg.endDate).setHours(23,59,59,999);
        const aDate = new Date(form.dateStr + "T00:00:00").getTime();
        
        if (aDate < startOfDay || aDate > endOfDay) {
          toast.error("La fecha de la parada debe estar entre el inicio y el fin del viaje.");
          setLoading(false);
          return;
        }
      }

      const dateNum = form.dateStr ? new Date(form.dateStr).getTime() : Date.now();
      
      if (editingId) {
        await updateMutation({
          activityId: editingId as any,
          activity: {
            title: form.title,
            description: form.description,
            date: dateNum,
            location: form.location,
            duration: form.duration,
            isIncluded: form.isIncluded,
            cost: form.cost,
            imageUrl: form.imageUrl || undefined,
            accommodation: form.accommodation || undefined,
          }
        });
        toast.success("Parada actualizada");
      } else {
        await addMutation({
          travelPackageId: packageId,
          activity: {
            title: form.title,
            description: form.description,
            date: dateNum,
            location: form.location,
            duration: form.duration,
            isIncluded: form.isIncluded,
            cost: form.cost,
            imageUrl: form.imageUrl || undefined,
            accommodation: form.accommodation || undefined,
          }
        });
        toast.success("Parada añadida");
      }
      if (!form.isIncluded && form.cost > 0 && form.increasePackagePrice && pkg.price !== undefined) {
        await updatePackageMutation({
          id: packageId,
          price: pkg.price + form.cost
        });
        // We notify the user but reloading state should reflect the new price.
        toast.info(`El precio del paquete ha aumentado en $${form.cost}`);
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (e: any) {
      toast.error("Error al guardar parada");
    } finally {
      setLoading(false);
    }
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen debe ser menor a 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } 
        else { if (h > MAX) { w *= MAX / h; h = MAX; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        setForm(f => ({ ...f, imageUrl: canvas.toDataURL("image/jpeg", 0.7) }));
      };
      img.src = b64;
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="flex flex-col gap-4 bg-card p-4 rounded-xl border shadow-sm">
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="font-semibold text-foreground">Itinerario</h2>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-1"
          onClick={() => { resetForm(); setIsDialogOpen(true); }}
        >
          <Plus className="h-4 w-4" />
          Añadir Parada
        </Button>
      </div>

      <div className="flex flex-col gap-3 mt-2">
        {activities.length === 0 ? (
          <div className="text-center p-6 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
            <Map className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay paradas en el itinerario aún.</p>
            <p className="text-xs mt-1">Añade destinos o actividades para formar el pipeline.</p>
          </div>
        ) : (
          activities.map((act, i) => (
            <div key={act._id} className="flex gap-3 items-start group relative bg-background p-3 rounded-lg border shadow-sm">
              <div className="flex flex-col items-center mt-1">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                  {i + 1}
                </div>
                {i !== activities.length - 1 && (
                  <Separator orientation="vertical" className="h-10 mt-1" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-sm line-clamp-1">{act.title}</h3>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(act)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(act._id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1 gap-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {act.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {act.date ? format(new Date(act.date), "MMM d") : ""}
                  </span>
                </div>
              </div>
              {act.imageUrl && (
                <div className="h-12 w-12 rounded object-cover overflow-hidden bg-muted shrink-0">
                  <img src={act.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Parada" : "Añadir Parada"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Foto de la parada */}
            <div
              className="relative h-32 w-full rounded-lg border-2 border-dashed border-muted-foreground/25 overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {form.imageUrl ? (
                <>
                  <img src={form.imageUrl} alt="Parada" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Button type="button" variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setForm(f => ({...f, imageUrl: null})); }}>
                      <X className="h-4 w-4 mr-1" /> Remover
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  <Camera className="h-8 w-8" />
                  <p className="text-xs font-medium">Añadir foto de la parada</p>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImage} accept="image/*" className="hidden" />
            </div>

            <div className="grid gap-2">
              <Label>Título *</Label>
              <Input placeholder="Ej. Llegada a París" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} />
            </div>

            <div className="grid gap-2">
              <Label>Ubicación *</Label>
              <LocationInput apiKey={getGoogleMapsApiKey()} value={form.location} onChange={v => setForm(f => ({...f, location: v}))} placeholder="Ej. Torre Eiffel, París" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Fecha</Label>
                <Input type="date" value={form.dateStr} onChange={e => setForm(f => ({...f, dateStr: e.target.value}))} />
              </div>
              <div className="grid gap-2">
                <Label>Duración</Label>
                <Input placeholder="Ej. 2 horas" value={form.duration} onChange={e => setForm(f => ({...f, duration: e.target.value}))} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Textarea placeholder="Qué se hará en este punto..." value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
            </div>

            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox id="included" checked={form.isIncluded} onCheckedChange={(c: boolean) => setForm(f => ({...f, isIncluded: c}))} />
              <Label htmlFor="included" className="font-normal cursor-pointer">Actividad gratuita / Ya incluida en el precio base</Label>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full flex items-center justify-between mt-2"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span className="text-sm font-medium">Opciones Adicionales</span>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {showAdvanced && (
              <div className="grid gap-4 bg-muted/30 p-3 rounded-lg border border-dashed animate-in fade-in slide-in-from-top-2">
                <div className="grid gap-2">
                  <Label>Alojamiento específico (opcional)</Label>
                  <Input placeholder="Ej. Hotel 4 estrellas en esta parada" value={form.accommodation} onChange={e => setForm(f => ({...f, accommodation: e.target.value}))} />
                </div>

                {!form.isIncluded && (
                  <div className="grid gap-3 pt-2">
                    <div className="grid gap-2">
                      <Label>Costo adicional estimado (COP)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input type="number" placeholder="0" className="pl-6" value={form.cost || ""} onChange={e => setForm(f => ({...f, cost: Number(e.target.value)}))} />
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <Checkbox id="increasePackagePrice" checked={form.increasePackagePrice} onCheckedChange={(c: boolean) => setForm(f => ({...f, increasePackagePrice: c}))} />
                      <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="increasePackagePrice" className="cursor-pointer font-medium">Sumar automáticamente al valor del viaje</Label>
                        <p className="text-[11px] text-muted-foreground">Si marcas esto, el costo de esta parada se sumará al precio total del paquete de viaje y modificará el cobro actual.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading}>{loading ? "Guardando..." : "Guardar Parada"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
