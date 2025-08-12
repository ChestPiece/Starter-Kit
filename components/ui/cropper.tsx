"use client";

import React from "react";
import CropperPrimitive from "react-easy-crop";
import { cn } from "@/lib/utils";

type CropArea = { x: number; y: number; width: number; height: number };

type CropperProps = {
  image: string;
  zoom?: number;
  aspectRatio?: number;
  onCropChange?: (area: CropArea | null) => void;
  onZoomChange?: (zoom: number) => void;
  className?: string;
  children?: React.ReactNode;
};

function Cropper({
  className,
  image,
  zoom = 1,
  aspectRatio = 1,
  onCropChange,
  onZoomChange,
  children,
}: CropperProps) {
  const [crop, setCrop] = React.useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [croppedAreaPixels, setCroppedAreaPixels] =
    React.useState<CropArea | null>(null);

  return (
    <div
      data-slot="cropper"
      className={cn(
        "relative flex h-full w-full cursor-move touch-none items-center justify-center overflow-hidden focus:outline-none",
        className
      )}
    >
      <CropperPrimitive
        image={image}
        crop={crop}
        zoom={zoom}
        aspect={aspectRatio}
        onCropChange={setCrop}
        onZoomChange={(value) => onZoomChange?.(value)}
        onCropComplete={(_, areaPixels) => {
          const area: CropArea = {
            x: areaPixels.x,
            y: areaPixels.y,
            width: areaPixels.width,
            height: areaPixels.height,
          };
          setCroppedAreaPixels(area);
          onCropChange?.(area);
        }}
        showGrid={false}
      />
      {children}
    </div>
  );
}

function CropperDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="cropper-description"
      className={cn("sr-only", className)}
      {...props}
    />
  );
}

function CropperImage({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="cropper-image"
      className={cn("pointer-events-none h-full w-full", className)}
      {...props}
    />
  );
}

function CropperCropArea({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="cropper-crop-area"
      className={cn(
        "pointer-events-none absolute border-3 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]",
        className
      )}
      {...props}
    />
  );
}

export { Cropper, CropperDescription, CropperImage, CropperCropArea };
