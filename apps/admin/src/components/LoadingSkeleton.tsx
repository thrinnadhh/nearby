interface LoadingSkeletonProps {
  count?: number;
}

export default function LoadingSkeleton({ count = 5 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg p-6 space-y-4">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}
