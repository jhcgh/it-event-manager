import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload } from "lucide-react";
import { useState } from "react";
import { Event } from "@shared/schema";

interface CSVUploadResponse {
  message: string;
  successCount: number;
  failedCount: number;
  events: Event[];
}

export function UploadEventsDialog() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiRequest<CSVUploadResponse>("POST", "/api/events/upload-csv", formData);

      queryClient.invalidateQueries({ queryKey: ["/api/events"] });

      toast({
        title: "Upload successful",
        description: `${response.successCount} events imported successfully. ${response.failedCount} failed.`,
        variant: response.failedCount > 0 ? "destructive" : "default",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload events",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = ''; // Reset file input
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Events CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing multiple events to import them in bulk.
            <div className="mt-2 text-sm">
              Required columns:
              <ul className="list-disc list-inside mt-1">
                <li>title</li>
                <li>description</li>
                <li>date (YYYY-MM-DD HH:mm:ss)</li>
                <li>city</li>
                <li>country</li>
                <li>isRemote (true/false)</li>
                <li>isHybrid (true/false)</li>
                <li>type (seminar/conference/workshop)</li>
              </ul>
              Optional columns:
              <ul className="list-disc list-inside mt-1">
                <li>url</li>
                <li>imageUrl</li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <p className="text-sm text-muted-foreground">
            Maximum file size: 5MB
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}