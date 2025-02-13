import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Plus, CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InsertEvent, insertEventSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function CreateEventDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [locationType, setLocationType] = useState<"in-person" | "online" | "hybrid">("in-person");

  const form = useForm<InsertEvent>({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      title: "",
      description: "",
      date: new Date(),
      city: "",
      country: "",
      isRemote: false,
      isHybrid: false,
      type: "seminar",
      url: "",
      imageUrl: "",
    }
  });

  const handleLocationTypeChange = (type: "in-person" | "online" | "hybrid") => {
    setLocationType(type);
    if (type === "in-person") {
      form.setValue("isRemote", false);
      form.setValue("isHybrid", false);
    } else if (type === "online") {
      form.setValue("isRemote", true);
      form.setValue("isHybrid", false);
    } else if (type === "hybrid") {
      form.setValue("isRemote", true);
      form.setValue("isHybrid", true);
    }
  };

  const createEventMutation = useMutation({
    mutationFn: async (data: InsertEvent) => {
      const res = await apiRequest("POST", "/api/events", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Success",
        description: "Event created successfully",
      });
      form.reset();
      setDate(new Date());
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
    createEventMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="flex items-center gap-1 text-xs h-7 px-2">
          <Plus className="h-3 w-3" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Fill in the event details below. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                }
                form.register("description").onChange(e);
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
                    onClick={() => {
                      form.setValue("date", date);
                      setCalendarOpen(false);
                    }}
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
              defaultValue={form.getValues("type")}
              onValueChange={(value) => form.setValue("type", value)}
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
            <Input id="url" type="url" {...form.register("url")} />
            {form.formState.errors.url && (
              <p className="text-sm text-destructive">{form.formState.errors.url.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL (Optional)</Label>
            <Input id="imageUrl" type="url" {...form.register("imageUrl")} />
            {form.formState.errors.imageUrl && (
              <p className="text-sm text-destructive">{form.formState.errors.imageUrl.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={createEventMutation.isPending}>
            {createEventMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}