import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Pencil, CalendarIcon, Image as ImageIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InsertEvent, insertEventSchema, Event } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

type EditEventDialogProps = {
  event: Event;
};

export function EditEventDialog({ event }: EditEventDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date(event.date));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [locationType, setLocationType] = useState<"in-person" | "online" | "hybrid">(
    event.isHybrid ? "hybrid" : event.isRemote ? "online" : "in-person"
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(event.imageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<InsertEvent>({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      title: event.title,
      description: event.description,
      date: new Date(event.date),
      city: event.city,
      country: event.country,
      isRemote: event.isRemote,
      isHybrid: event.isHybrid,
      type: event.type,
      url: event.url || "",
      imageUrl: event.imageUrl || "",
    }
  });

  const handleLocationTypeChange = (type: "in-person" | "online" | "hybrid") => {
    setLocationType(type);
    const updates = {
      isRemote: type === "online" || type === "hybrid",
      isHybrid: type === "hybrid"
    };
    Object.entries(updates).forEach(([key, value]) => {
      form.setValue(key as "isRemote" | "isHybrid", value, { 
        shouldValidate: false,
        shouldDirty: false
      });
    });
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        form.setValue("imageUrl", reader.result as string, {
          shouldValidate: false,
          shouldDirty: false
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const updateEventMutation = useMutation({
    mutationFn: async (data: InsertEvent) => {
      const res = await apiRequest("PATCH", `/api/events/${event.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      toast({
        title: "Success",
        description: "Event updated successfully",
      });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: InsertEvent) => {
    updateEventMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="action-button flex items-center gap-1"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="image" className="flex items-center gap-2">
              Event Image
              <ImageIcon className="h-4 w-4" />
            </Label>
            <input
              type="file"
              id="image"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageChange}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors",
                "flex flex-col items-center justify-center gap-2",
                selectedImage ? "aspect-video" : "h-[200px]"
              )}
            >
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt="Event preview"
                  className="rounded-lg max-h-[300px] w-full object-cover"
                />
              ) : (
                <>
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload an image
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Event Name *</Label>
            <Input id="title" {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description * (Max 50 words)</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              onChange={(e) => {
                const words = e.target.value.trim().split(/\s+/).length;
                if (words > 50) {
                  form.setError("description", {
                    type: "manual",
                    message: "Description must not exceed 50 words"
                  });
                } else {
                  form.clearErrors("description");
                  form.setValue("description", e.target.value);
                }
              }}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Words: {form.getValues("description")?.trim().split(/\s+/).length || 0}/50
            </p>
          </div>

          <div className="space-y-2">
            <Label>Event Date *</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    if (newDate) {
                      setDate(newDate);
                      form.setValue("date", newDate);
                    }
                  }}
                  disabled={(date) =>
                    date < new Date(new Date().setHours(0, 0, 0, 0))
                  }
                  initialFocus
                />
                <div className="flex justify-end gap-2 p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCalendarOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setCalendarOpen(false)}
                  >
                    OK
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            {form.formState.errors.date && (
              <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Event Location Type *</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="inPerson"
                  name="locationType"
                  className="h-4 w-4"
                  checked={locationType === "in-person"}
                  onChange={() => handleLocationTypeChange("in-person")}
                />
                <Label htmlFor="inPerson">In Person</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="hybrid"
                  name="locationType"
                  className="h-4 w-4"
                  checked={locationType === "hybrid"}
                  onChange={() => handleLocationTypeChange("hybrid")}
                />
                <Label htmlFor="hybrid">In Person & Online</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="online"
                  name="locationType"
                  className="h-4 w-4"
                  checked={locationType === "online"}
                  onChange={() => handleLocationTypeChange("online")}
                />
                <Label htmlFor="online">Online</Label>
              </div>
            </div>
          </div>

          {locationType !== "online" && (
            <div className="space-y-2">
              <Label>Location *</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Enter city"
                    {...form.register("city")}
                  />
                  {form.formState.errors.city && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.city.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="Enter country"
                    {...form.register("country")}
                  />
                  {form.formState.errors.country && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.country.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Event Type *</Label>
            <Select
              value={form.getValues("type")}
              onValueChange={(value) => {
                form.setValue("type", value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seminar">Seminar</SelectItem>
                <SelectItem value="conference">Conference</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Event URL</Label>
            <Input 
              id="url" 
              type="url" 
              {...form.register("url")} 
            />
            {form.formState.errors.url && (
              <p className="text-sm text-destructive">{form.formState.errors.url.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={updateEventMutation.isPending}>
            {updateEventMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Updating...
              </>
            ) : (
              "Update Event"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}