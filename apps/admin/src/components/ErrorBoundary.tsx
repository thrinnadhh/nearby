import { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
  error?: Error | null;
}

export default function ErrorBoundary({
  children,
  error,
}: ErrorBoundaryProps) {
  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-4">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-red-900">
              Something went wrong
            </h3>
            <p className="text-sm text-red-700 mt-2">
              {error.message || 'An unexpected error occurred'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
