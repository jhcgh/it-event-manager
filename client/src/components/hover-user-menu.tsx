import { UserCircle, Settings } from "lucide-react";
import { User } from "@shared/schema";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface HoverUserMenuProps {
  user: User;
}

export function HoverUserMenu({ user }: HoverUserMenuProps) {
  const { logoutMutation } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          size="sm"
          variant="ghost" 
          className="flex items-center hover:bg-accent h-7 w-7 p-0"
        >
          <UserCircle className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex flex-col space-y-1 p-2">
          <p className="text-sm font-medium leading-none">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs leading-none text-muted-foreground">
            {user.title}
          </p>
          <p className="text-xs leading-none text-muted-foreground">
            {user.username}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            View Profile
          </Link>
        </DropdownMenuItem>
        {/* Show Company Settings for all users except super-admin */}
        {!user.isSuperAdmin && user.companyId && (
          <DropdownMenuItem asChild>
            <Link href="/company-settings" className="cursor-pointer flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              Company Settings
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? "Logging out..." : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}