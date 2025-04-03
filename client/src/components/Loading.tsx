import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <div className="mt-4 text-lg text-gray-600">載入中...</div>
    </div>
  );
}