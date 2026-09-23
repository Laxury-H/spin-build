import { Suspense } from "react";
import { SpinLab } from "@/components/lab/SpinLab";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8 label text-muted">
          INITIALIZING SPIN LAB…
        </div>
      }
    >
      <SpinLab />
    </Suspense>
  );
}
