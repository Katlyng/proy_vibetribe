import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/80 animate-in fade-in-0"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50 w-full max-w-md mx-4 bg-background rounded-xl border shadow-lg animate-in zoom-in-95 fade-in-0">
        {children}
      </div>
    </div>
  );
}

interface AlertDialogContentProps {
  className?: string;
  children: React.ReactNode;
}

export function AlertDialogContent({ className, children }: AlertDialogContentProps) {
  return (
    <div className={`p-6 ${className || ""}`}>
      {children}
    </div>
  );
}

interface AlertDialogHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export function AlertDialogHeader({ className, children }: AlertDialogHeaderProps) {
  return (
    <div className={`flex flex-col gap-2 mb-4 ${className || ""}`}>
      {children}
    </div>
  );
}

interface AlertDialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

export function AlertDialogTitle({ className, children }: AlertDialogTitleProps) {
  return (
    <h2 className={`text-lg font-semibold flex items-center gap-2 ${className || ""}`}>
      {children}
    </h2>
  );
}

interface AlertDialogDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export function AlertDialogDescription({ className, children }: AlertDialogDescriptionProps) {
  return (
    <p className={`text-sm text-muted-foreground ${className || ""}`}>
      {children}
    </p>
  );
}

interface AlertDialogFooterProps {
  className?: string;
  children: React.ReactNode;
}

export function AlertDialogFooter({ className, children }: AlertDialogFooterProps) {
  return (
    <div className={`flex flex-row gap-2 justify-end mt-6 ${className || ""}`}>
      {children}
    </div>
  );
}

interface AlertDialogActionProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "ghost" | "secondary";
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export function AlertDialogAction({ className, variant = "default", onClick, disabled, children }: AlertDialogActionProps) {
  return (
    <Button variant={variant} onClick={onClick} disabled={disabled} className={`min-w-[100px] ${className || ""}`}>
      {children}
    </Button>
  );
}

interface AlertDialogCancelProps {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

export function AlertDialogCancel({ className, onClick, children }: AlertDialogCancelProps) {
  return (
    <Button variant="outline" onClick={onClick} className={`min-w-[100px] ${className || ""}`}>
      {children}
    </Button>
  );
}

export { AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel };