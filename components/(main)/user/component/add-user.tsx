"use client";

import { useState, useEffect } from "react";
import { CheckIcon, ImagePlusIcon, XIcon } from "lucide-react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveFile } from "@/supabase/actions/save-file";
import { usersService } from "@/modules/users/services/users-service";
import Image from "next/image";
import type { Role } from "@/modules/roles/models/role";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { generateNameAvatar } from "@/utils/generateRandomAvatar";
import { Avatar, ProfileBg } from "./image-setting";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Default avatar image
const initialAvatarImage = [
  {
    name: "avatar-default.jpg",
    size: 1528737,
    type: "image/jpeg",
    url: "/images/profile.jpg",
    id: "avatar-default",
  },
];

// Define form validation schema (password fields removed - no authentication)
const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required"),
});

interface AddUserProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onRefresh?: () => void;
  listRoles?: Role[];
}

export default function AddUser({
  open = false,
  onOpenChange,
  onRefresh,
  listRoles,
}: AddUserProps) {
  const [avatar, setAvatar] = useState("");
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [profile, setProfile] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "",
    },
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      form.reset();
      setProfile("");
    }
  }, [open, form]);

  const initialBgImage = [
    {
      name: "profile-bg.jpg",
      size: 1528737,
      type: "image/jpeg",
      url: "/images/profile.jpg",
      id: "profile-bg-123456789",
    },
  ];

  // Handler for creating user (mock implementation - no authentication)
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      // Create user directly in the user service (no authentication required)
      const userData = {
        id: `mock-user-${Date.now()}`, // Generate a mock ID
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        profile: profile || "",
        role_id: values.role,
      };

      await usersService.createUser(userData);

      toast.success("User created successfully");

      // Close dialog and refresh user list
      if (onOpenChange) onOpenChange(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create user"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[80vh]">
          <Avatar
            avatar={avatar}
            setAvatar={setAvatar}
            isFileLoading={isFileLoading}
            setIsFileLoading={setIsFileLoading}
            profile={profile}
            setProfile={setProfile}
            initialAvatarImage={initialAvatarImage}
          />
          <div className="pt-4 pb-2">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem className="flex-1 space-y-1 flex flex-col gap-1">
                        <FormLabel className="h-max">First name</FormLabel>
                        <FormControl>
                          <Input placeholder="First name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem className="flex-1 space-y-1 flex flex-col  gap-1">
                        <FormLabel className="h-max">Last name</FormLabel>
                        <FormControl>
                          <Input placeholder="Last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-1 flex flex-col gap-1">
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Email" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="space-y-1  gap-1">
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="uppercase">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {listRoles?.map((role) => (
                            <SelectItem
                              key={role.id}
                              value={role.id}
                              className="uppercase"
                            >
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange?.(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isLoading ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
