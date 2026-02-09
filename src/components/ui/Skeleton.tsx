interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      aria-label="Loading..."
    />
  );
}

// Preset Variants für häufige Use Cases
export function SkeletonText({ className = '' }: SkeletonProps) {
  return <Skeleton className={`h-4 ${className}`} />;
}

export function SkeletonTitle({ className = '' }: SkeletonProps) {
  return <Skeleton className={`h-8 ${className}`} />;
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <SkeletonTitle className="w-1/2 mb-4" />
      <SkeletonText className="w-3/4 mb-2" />
      <SkeletonText className="w-2/3" />
    </div>
  );
}

export function SkeletonInput({ className = '' }: SkeletonProps) {
  return <Skeleton className={`h-10 w-full ${className}`} />;
}
