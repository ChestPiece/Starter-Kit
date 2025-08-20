"use client";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "@/components/auth/user-context";
import { userService } from "@/lib/services/user-service";
import { Button } from "@/components/ui/button";
import { saveFile } from "@/supabase/actions/save-file";
import { toast } from "sonner";
import { useFileUpload } from "@/hooks/use-file-upload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Cropper,
  CropperCropArea,
  CropperDescription,
  CropperImage,
} from "@/components/ui/cropper";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeftIcon,
  CircleUserRoundIcon,
  UserIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { Area, getCroppedImg } from "@/utils/image-crop";

export type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  roles: { name: string };
  avatar_url?: string;
  profile?: string;
};

export function ProfileSettings() {
  const { supabaseUser } = useUser();
  // State for user profile data
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    if (!supabaseUser?.id) {
      return; // wait for auth to load
    }

    setProfileLoading(true);
    try {
      const userData = await userService.getUserProfile(supabaseUser.id);

      if (userData) {
        setUserProfile({
          id: userData.id,
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          email: userData.email || "",
          roles: userData.roles || { name: "user" },
          avatar_url: userData.profile || undefined,
          profile: userData.profile || undefined,
        });
      } else {
        // Fallback
        setUserProfile({
          id: supabaseUser?.id || "fallback-id",
          first_name: supabaseUser?.user_metadata?.first_name || "User",
          last_name: supabaseUser?.user_metadata?.last_name || "",
          email: supabaseUser?.email || "user@example.com",
          roles: { name: "user" },
          avatar_url: undefined,
          profile: undefined,
        });
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      // Fallback
      setUserProfile({
        id: supabaseUser?.id || "fallback-id",
        first_name: supabaseUser?.user_metadata?.first_name || "User",
        last_name: supabaseUser?.user_metadata?.last_name || "",
        email: supabaseUser?.email || "user@example.com",
        roles: { name: "user" },
        avatar_url: undefined,
        profile: undefined,
      });
    } finally {
      setProfileLoading(false);
    }
  }, [
    supabaseUser?.id,
    supabaseUser?.email,
    supabaseUser?.user_metadata?.first_name,
    supabaseUser?.user_metadata?.last_name,
  ]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Image cropper states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [zoom, setZoom] = useState(1);

  const [
    { files, isDragging },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      getInputProps,
    },
  ] = useFileUpload({
    accept: "image/*",
  });

  const previewUrl = files[0]?.preview || null;
  const fileId = files[0]?.id;
  const previousFileIdRef = useRef<string | undefined | null>(null);

  // Callback for Cropper to provide crop data
  const handleCropChange = useCallback((pixels: Area | null) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleApplyCrop = async () => {
    if (!previewUrl || !fileId || !croppedAreaPixels) {
      return;
    }

    try {
      setIsUploading(true);
      // Get the cropped image blob
      const croppedBlob = await getCroppedImg(previewUrl, croppedAreaPixels);

      if (!croppedBlob) {
        throw new Error("Failed to generate cropped image blob.");
      }

      // Convert blob to file
      const file = new File([croppedBlob], "profile-image.jpg", {
        type: "image/jpeg",
      });

      // Upload the file to server/storage
      const fileUrl = await saveFile(file);
      if (fileUrl) {
        setUserProfile((prev) =>
          prev
            ? {
                ...prev,
                profile: fileUrl,
              }
            : null
        );
      }

      // Close the dialog
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error during apply:", error);
      toast.error("Failed to process image");
    } finally {
      setIsUploading(false);
    }
  };

  // Effect to open dialog when a new file is ready
  useEffect(() => {
    if (fileId && fileId !== previousFileIdRef.current) {
      setIsDialogOpen(true);
      setCroppedAreaPixels(null);
      setZoom(1);
    }
    previousFileIdRef.current = fileId;
  }, [fileId]);

  const handleUpdateUserProfile = async () => {
    if (!userProfile) return;

    setIsLoading(true);
    try {
      await userService.updateUserProfile(supabaseUser?.id || "", {
        id: supabaseUser?.id || "",
        first_name: userProfile.first_name,
        last_name: userProfile.last_name,
        profile: userProfile.profile || undefined,
      });
      // Mock profile update (authentication removed)
      console.log("Mock profile update:", {
        first_name: userProfile.first_name,
        last_name: userProfile.last_name,
        profile: userProfile.profile,
      });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAvatar = () => {
    setUserProfile((prev) =>
      prev
        ? {
            ...prev,
            profile: undefined,
          }
        : null
    );
  };

  // Show loading state while profile is being loaded
  if (profileLoading) {
    return (
      <Card className="w-full flex-1">
        <CardHeader>
          <CardTitle className="text-2xl">Personal Information</CardTitle>
          <CardDescription>
            Update your personal details and profile picture
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading profile...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userProfile) {
    return (
      <Card className="w-full flex-1">
        <CardHeader>
          <CardTitle className="text-2xl">Personal Information</CardTitle>
          <CardDescription>
            Update your personal details and profile picture
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No profile data found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full flex-1">
      <CardHeader>
        <CardTitle className="text-2xl">Personal Information</CardTitle>
        <CardDescription>
          Update your personal details and profile picture
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Picture with Image Cropper */}
        <div className=" rounded-lg space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative inline-flex">
              <button
                className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-input bg-background hover:bg-accent/50 data-[dragging=true]:bg-accent/50"
                onClick={openFileDialog}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                data-dragging={isDragging || undefined}
                aria-label={
                  userProfile.profile ? "Change image" : "Upload image"
                }
              >
                {userProfile.profile ? (
                  <Image
                    className="h-full w-full object-cover"
                    src={userProfile.profile}
                    alt="User avatar"
                    width={80}
                    height={80}
                  />
                ) : (
                  <div aria-hidden="true">
                    <UserIcon className="h-8 w-8 opacity-60" />
                  </div>
                )}
              </button>
              {userProfile.profile && (
                <Button
                  onClick={handleRemoveAvatar}
                  size="icon"
                  className="absolute -top-1 -right-1 h-6 w-6 rounded-full border-2 border-background shadow-none focus-visible:border-background"
                  aria-label="Remove image"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </Button>
              )}
              <input
                {...getInputProps()}
                className="sr-only"
                aria-label="Upload profile picture"
                tabIndex={-1}
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {isUploading ? "Uploading..." : "Click or drag to upload"}
            </span>
          </div>
        </div>

        {/* Name Fields in Responsive Row */}
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-base font-medium">Full Name</Label>
            <p className="text-sm text-muted-foreground">
              Your first and last name as you'd like it to appear
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first-name">First Name</Label>
              <Input
                id="first-name"
                placeholder="Enter first name"
                value={userProfile.first_name}
                onChange={(e) =>
                  setUserProfile((prev) =>
                    prev
                      ? {
                          ...prev,
                          first_name: e.target.value,
                        }
                      : null
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last Name</Label>
              <Input
                id="last-name"
                placeholder="Enter last name"
                value={userProfile.last_name}
                onChange={(e) =>
                  setUserProfile((prev) =>
                    prev
                      ? {
                          ...prev,
                          last_name: e.target.value,
                        }
                      : null
                  )
                }
              />
            </div>
          </div>
        </div>

        {/* Email Field */}
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-base font-medium">Email Address</Label>
            <p className="text-sm text-muted-foreground">
              Your email address is used for signing in
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={userProfile.email}
              disabled
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed. Contact an administrator for assistance.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button onClick={handleUpdateUserProfile} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>

      {/* Image Cropper Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crop Profile Picture</DialogTitle>
            <DialogDescription>
              Adjust your profile picture to fit the circular frame
            </DialogDescription>
          </DialogHeader>
          {previewUrl && (
            <Cropper
              className="h-96"
              image={previewUrl}
              zoom={zoom}
              onCropChange={handleCropChange}
              onZoomChange={setZoom}
            >
              <CropperDescription />
              <CropperImage />
              <CropperCropArea />
            </Cropper>
          )}
          <DialogFooter className="border-t px-4 py-6">
            <div className="flex flex-col gap-4 w-full">
              {/* Zoom Controls */}
              <div className="mx-auto flex w-full max-w-80 items-center gap-4">
                <ZoomOutIcon
                  className="shrink-0 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
                <Slider
                  defaultValue={[1]}
                  value={[zoom]}
                  min={1}
                  max={3}
                  step={0.1}
                  onValueChange={(value) => setZoom(value[0])}
                  aria-label="Zoom slider"
                />
                <ZoomInIcon
                  className="shrink-0 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
              </div>
              {/* Apply Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleApplyCrop}
                  disabled={!previewUrl || isUploading}
                  className="min-w-24"
                >
                  {isUploading ? "Processing..." : "Apply"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
