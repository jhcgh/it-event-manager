import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminBar() {
  return (
    <div className="bg-destructive/10 border-b border-destructive/20">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Admin Access
        </div>
        <Link href="/admin">
          <Button size="sm" variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/10">
            Admin Portal
          </Button>
        </Link>
      </div>
    </div>
  );
}