
import { cn } from "../lib/utils";
import * as React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Shape of the skeleton */
  variant?: "default" | "circle" | "rounded" | "square";
  /** Width of the skeleton */
  width?: string | number;
  /** Height of the skeleton */
  height?: string | number;
  /** Animation type for the skeleton */
  animation?: "pulse" | "wave" | "none";
  /** Whether to show a shimmer effect */
  shimmer?: boolean;
  /** Number of skeleton items to display */
  count?: number;
}

interface ConsultationCardSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  footer?: "single" | "double" | "primary-with-icon";
  profileLines?: 2 | 3;
}

interface CompactConsultationSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "date" | "avatar";
}

function Skeleton({
  className,
  variant = "default",
  width,
  height,
  animation = "pulse",
  shimmer = false,
  count = 1,
  ...props
}: SkeletonProps) {
  // Variant classes
  const variantClasses = {
    default: "rounded-md",
    circle: "rounded-full",
    rounded: "rounded-xl",
    square: "rounded-none"
  };

  // Animation classes
  const animationClasses = {
    pulse: "animate-pulse",
    wave: "animate-shimmer",
    none: ""
  };

  // Style object for width and height
  const style: React.CSSProperties = {
    width: width !== undefined ? (typeof width === "number" ? `${width}px` : width) : undefined,
    height: height !== undefined ? (typeof height === "number" ? `${height}px` : height) : undefined,
    ...props.style
  };

  // Render multiple skeleton items if count > 1
  if (count > 1) {
    return (
      <div className={cn("flex flex-col gap-2", className)} {...props}>
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "bg-muted relative overflow-hidden",
              variantClasses[variant],
              animationClasses[animation],
              shimmer && "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent"
            )}
            style={style}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-primary/20 relative overflow-hidden",
        variantClasses[variant],
        animationClasses[animation],
        shimmer && "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
        className
      )}
      style={style}
      {...props}
    />
  );
}

function ConsultationCardSkeleton({
  className,
  footer = "single",
  profileLines = 2,
  ...props
}: ConsultationCardSkeletonProps) {
  return (
    <div
      className={cn("rounded-xl border bg-white p-4 shadow-sm h-full flex flex-col", className)}
      {...props}
    >
      <div className="flex items-start justify-between gap-3 pb-2">
        <Skeleton className="h-6 w-28 rounded-full" shimmer />
        <Skeleton className="h-6 w-20 rounded-full" shimmer />
      </div>

      <div className="space-y-3 flex-1">
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-5 flex-1 max-w-[65%]" shimmer />
          <Skeleton className="h-6 w-24 rounded-full" shimmer />
        </div>

        <Skeleton className="h-4 w-40" shimmer />

        <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2.5">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" shimmer />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" shimmer />
            <Skeleton className="h-3 w-24" shimmer />
            {profileLines === 3 ? <Skeleton className="h-3 w-20" shimmer /> : null}
          </div>
        </div>
      </div>

      <div className="pt-3 mt-auto">
        {footer === "double" ? (
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-9 w-full rounded-md" shimmer />
            <Skeleton className="h-9 w-full rounded-md" shimmer />
          </div>
        ) : footer === "primary-with-icon" ? (
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1 rounded-md" shimmer />
            <Skeleton className="h-9 w-10 rounded-md" shimmer />
          </div>
        ) : (
          <Skeleton className="h-9 w-full rounded-md" shimmer />
        )}
      </div>
    </div>
  );
}

function CompactConsultationSkeleton({
  className,
  variant = "date",
  ...props
}: CompactConsultationSkeletonProps) {
  if (variant === "avatar") {
    return (
      <div className={cn("compact-consultation-card", className)} {...props}>
        <div className="compact-avatar-section">
          <Skeleton className="h-12 w-12 rounded-full" shimmer />
        </div>

        <div className="compact-content">
          <div className="compact-title-row">
            <Skeleton className="h-4 w-32" shimmer />
            <Skeleton className="h-5 w-20 rounded-full" shimmer />
          </div>

          <div className="compact-faculty-info">
            <Skeleton className="h-4 w-28" shimmer />
            <Skeleton className="h-3 w-20" shimmer />
          </div>

          <div className="compact-time-info">
            <Skeleton className="h-3 w-36" shimmer />
          </div>

          <div className="compact-badges">
            <Skeleton className="h-5 w-20 rounded-full" shimmer />
          </div>
        </div>

        <div className="compact-action">
          <Skeleton className="h-9 w-24 rounded-md" shimmer />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("compact-consultation-card", className)} {...props}>
      <div className="compact-date-section">
        <div className="compact-date">
          <div className="flex flex-col items-center gap-1">
            <Skeleton className="h-2.5 w-7 rounded-full" shimmer />
            <Skeleton className="h-4 w-5 rounded-full" shimmer />
          </div>
        </div>
      </div>

      <div className="compact-content">
        <div className="compact-faculty-info">
          <Skeleton className="h-4 w-28" shimmer />
          <Skeleton className="h-3 w-36" shimmer />
          <Skeleton className="h-4 w-16 rounded-md" shimmer />
        </div>

        <div className="compact-time-info">
          <Skeleton className="h-3 w-24" shimmer />
        </div>

        <div className="compact-badges">
          <Skeleton className="h-5 w-16 rounded-full" shimmer />
          <Skeleton className="h-5 w-20 rounded-full" shimmer />
        </div>
      </div>

      <div className="compact-action">
        <Skeleton className="h-8 w-20 rounded-md" shimmer />
      </div>
    </div>
  );
}

function AdvisorCardSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("advisor-card-new h-full flex flex-col rounded-xl border bg-white p-4 shadow-sm", className)}
      {...props}
    >
      <div className="flex items-center gap-3 pb-3">
        <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" shimmer />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-4 w-32" shimmer />
          <Skeleton className="h-3 w-24" shimmer />
        </div>
      </div>

      <div className="flex-1 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" shimmer />
          <Skeleton className="h-5 w-14 rounded-full" shimmer />
          <Skeleton className="h-5 w-20 rounded-full" shimmer />
        </div>

        <div className="border-t pt-3 space-y-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-3 w-20 mt-1" shimmer />
            <Skeleton className="h-5 w-28 rounded-full" shimmer />
          </div>

          <div className="flex items-start gap-3">
            <Skeleton className="h-3 w-12 mt-1" shimmer />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-5 w-20 rounded-full" shimmer />
              <Skeleton className="h-5 w-24 rounded-full" shimmer />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-3 mt-auto">
        <Skeleton className="h-9 w-full rounded-md" shimmer />
        <Skeleton className="h-9 w-full rounded-md" shimmer />
      </div>
    </div>
  );
}

function CounterpartRowSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-4 bg-white rounded-lg border flex items-center gap-3", className)} {...props}>
      <Skeleton className="w-10 h-10 rounded-full" shimmer />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-36" shimmer />
        <Skeleton className="h-3 w-44" shimmer />
        <Skeleton className="h-3 w-32" shimmer />
      </div>
      <Skeleton className="h-4 w-4 rounded-sm" shimmer />
    </div>
  );
}

function TemplateCardSkeleton(props: React.HTMLAttributes<HTMLDivElement>) {
  return <AdvisorCardSkeleton {...props} />;
}

export {
  Skeleton,
  TemplateCardSkeleton,
  ConsultationCardSkeleton,
  CompactConsultationSkeleton,
  AdvisorCardSkeleton,
  CounterpartRowSkeleton,
};
