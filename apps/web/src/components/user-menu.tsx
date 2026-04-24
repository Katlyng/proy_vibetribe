import { api } from "@proy_vibetribe/backend/convex/_generated/api";
import { Button } from "@proy_vibetribe/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@proy_vibetribe/ui/components/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@proy_vibetribe/ui/components/avatar";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { UserIcon, MapPin, LogOut } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const navigate = useNavigate();
  const user = useQuery(api.auth.getCurrentUser);

  if (user === undefined) return <div className="h-10 w-10 animate-pulse bg-muted rounded-full" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-border/50 shadow-sm p-0 overflow-hidden" />
      }>
        <Avatar className="h-full w-full">
          <AvatarImage src={user?.image || ""} alt={user?.name || "Avatar"} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56 bg-card" align="start" forceMount>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal p-2">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none text-foreground">{user?.name}</p>
              <p className="text-xs leading-none text-muted-foreground mt-1">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => navigate({ to: "/dashboard" })}
          >
            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
            Explorar Viajes
          </DropdownMenuItem>

          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => navigate({ to: "/profile" })}
          >
            <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            Mi Perfil
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    navigate({
                      to: "/",
                    });
                  },
                },
              });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
