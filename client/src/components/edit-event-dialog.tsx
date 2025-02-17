import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Pencil, CalendarIcon, Image as ImageIcon, Trash2 } from "lucide-react";
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
 onDelete?: (event: Event) => Promise<void>;
};

export function EditEventDialog({ event, onDelete }: EditEventDialogProps) {
 const { toast } = useToast();
 const [open, setOpen] = useState(false);
 const [date, setDate] = useState<Date>(new Date(event.date));
 const [calendarOpen, setCalendarOpen] = useState(false);
 const [locationType, setLocationType] = useState<"in-person" | "online" | "hybrid">(
   event.isHybrid ? "hybrid" : event.isRemote ? "online" : "in-person"
 );
 const [selectedImage, setSelectedImage] = useState<string | null>(event.imageUrl || null);
 const [isDeleting, setIsDeleting] = useState(false);
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
     status: event.status, // Preserve the current status
   },
 });

 const handleLocationTypeChange = (type: "in-person" | "online" | "hybrid") => {
   setLocationType(type);
   form.setValue("isRemote", type === "online" || type === "hybrid", {
     shouldDirty: true,
     shouldValidate: false
   });
   form.setValue("isHybrid", type === "hybrid", {
     shouldDirty: true,
     shouldValidate: false
   });
 };

 const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
   const file = event.target.files?.[0];
   if (file) {
     const reader = new FileReader();
     reader.onloadend = () => {
       const imageUrl = reader.result as string;
       setSelectedImage(imageUrl);
       form.setValue("imageUrl", imageUrl, {
         shouldDirty: true,
         shouldValidate: false
       });
     };
     reader.readAsDataURL(file);
   }
 };

 const handleDelete = async () => {
   if (!onDelete) return;

   setIsDeleting(true);
   try {
     await onDelete(event);
     setOpen(false);
   } catch (error) {
     console.error('Failed to delete event:', error);
   } finally {
     setIsDeleting(false);
   }
 };

 const updateEventMutation = useMutation({
   mutationFn: async (data: InsertEvent) => {
     try {
       const response = await apiRequest("PATCH", `/api/events/${event.id}`, data);

       if (!response.ok) {
         const errorText = await response.text();
         console.error('Error response:', {
           status: response.status,
           statusText: response.statusText,
           body: errorText
         });

         let errorMessage;
         try {
           const errorData = JSON.parse(errorText);
           errorMessage = errorData.message || errorData.error || 'Failed to update event';
         } catch (e) {
           errorMessage = errorText || 'Failed to update event';
         }

         throw new Error(errorMessage);
       }

       // For successful responses
       if (response.status === 204) {
         return null;
       }

       const responseText = await response.text();
       if (!responseText) {
         return null;
       }

       return JSON.parse(responseText);
     } catch (error) {
       console.error('Update event error:', error);
       throw error;
     }
   },
   onSuccess: () => {
     queryClient.invalidateQueries({ queryKey: ["/api/events"] });
     queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
     if (event.userId) {
       queryClient.invalidateQueries({ queryKey: [`/api/users/${event.userId}/events`] });
     }
     toast({
       title: "Success",
       description: "Event updated successfully",
     });
     setOpen(false);
   },
   onError: (error: Error) => {
     console.error('Update event error:', error);
     toast({
       title: "Error",
       description: error.message || "Failed to update event",
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
         <DialogDescription>
           Make changes to your event. All changes will be saved when you click the Update Event button.
         </DialogDescription>
       </DialogHeader>
       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
         {/* Image Upload */}
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

         {/* Event Details Form Fields */}
         <div className="space-y-2">
           <Label htmlFor="title">Event Name *</Label>
           <Input id="title" {...form.register("title")} />
         </div>

         <div className="space-y-2">
           <Label htmlFor="description">Description *</Label>
           <Textarea
             id="description"
             {...form.register("description")}
           />
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
                     form.setValue("date", newDate, { shouldDirty: true, shouldValidate: false });
                   }
                 }}
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
               </div>
               <div className="space-y-2">
                 <Label htmlFor="country">Country</Label>
                 <Input
                   id="country"
                   placeholder="Enter country"
                   {...form.register("country")}
                 />
               </div>
             </div>
           </div>
         )}

         <div className="space-y-2">
           <Label>Event Type *</Label>
           <Select
             value={form.getValues("type")}
             onValueChange={(value) => {
               form.setValue("type", value, { shouldDirty: true, shouldValidate: false });
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
         </div>

         <div className="space-y-2">
           <Label htmlFor="url">Event URL</Label>
           <Input
             id="url"
             type="url"
             {...form.register("url")}
           />
         </div>

         <div className="flex gap-2">
           <Button type="submit" className="flex-1" disabled={updateEventMutation.isPending}>
             {updateEventMutation.isPending ? (
               <>
                 <Loader2 className="h-4 w-4 animate-spin mr-2" />
                 Updating...
               </>
             ) : (
               "Update Event"
             )}
           </Button>

           {onDelete && (
             <Button
               type="button"
               variant="destructive"
               onClick={handleDelete}
               disabled={isDeleting}
             >
               {isDeleting ? (
                 <>
                   <Loader2 className="h-4 w-4 animate-spin mr-2" />
                   Deleting...
                 </>
               ) : (
                 <>
                   <Trash2 className="h-4 w-4 mr-2" />
                   Delete
                 </>
               )}
             </Button>
           )}
         </div>
       </form>
     </DialogContent>
   </Dialog>
 );
}