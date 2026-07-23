"use client";

import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

export interface DemoVideoModalProps {
  /** e.g. "/demos/individual-user-demo.mp4" — see docs/demos/README.md for how this file is produced. */
  videoSrc: string;
  /** Shown before playback starts and if the video itself fails to load. */
  posterSrc?: string;
  title: string;
  description: string;
  trigger: ReactNode;
}

/**
 * A single reusable video-demo modal used by both the individual-user
 * "Watch 60 Second Demo" button (hero.tsx) and the facility "Watch
 * Facility Demo" button (for-facilities.tsx). Built on the existing
 * base-ui-backed Dialog component, which already provides Escape-to-close,
 * backdrop-click-to-close, and focus trapping/keyboard accessibility —
 * nothing extra needed here for that. The video never autoplays; it only
 * starts once the visitor opens the modal and presses play themselves,
 * and native <video> controls are always shown.
 */
export function DemoVideoModal({ videoSrc, posterSrc, title, description, trigger }: DemoVideoModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-lg bg-black">
          {open && (
            <video
              key={videoSrc}
              src={videoSrc}
              poster={posterSrc}
              controls
              playsInline
              preload="none"
              aria-label={title}
              className="aspect-video w-full"
            >
              <p className="p-4 text-sm text-white">
                Your browser doesn&apos;t support embedded video.{" "}
                <a href={videoSrc} className="underline">
                  Download the video
                </a>{" "}
                instead.
              </p>
            </video>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
