
import * as React from "react";
import { cn } from "../lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: React.ReactNode;
  status?: "online" | "offline" | "away" | "busy" | null;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, status, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
          "transition-all duration-300 ease-in-out hover:scale-105",
          className
        )}
        {...props}
      />
    );
  }
);
Avatar.displayName = "Avatar";

interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt, onError, onLoad, ...props }, ref) => {
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [imgError, setImgError] = React.useState(false);

    const finalSrc = src && !imgError ? src : null;

    const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setImgError(true);
      if (onError) onError(e);
    };

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setIsLoaded(true);
      if (onLoad) onLoad(e);
    };

    if (!finalSrc) return null;

    return (
      <img
        ref={ref}
        src={finalSrc}
        alt={alt || "Avatar"}
        className={cn(
          "aspect-square h-full w-full object-cover",
          "transition-opacity duration-300 ease-in-out",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        onError={handleError}
        onLoad={handleLoad}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = "AvatarImage";

const getInitials = (name?: string) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || "").join("") || "";
};

interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {}

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps & { name?: string }>(
  ({ className, name, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full text-xs font-semibold uppercase select-none",
        "bg-gray-200 text-gray-700 border border-gray-300/10",
        "animate-in fade-in-0 zoom-in-0 duration-300",
        className
      )}
      {...props}
    >
      {children || getInitials(name)}
    </div>
  )
);
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
