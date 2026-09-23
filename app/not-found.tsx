import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-6 min-h-[60vh]">
      <div className="flex flex-col gap-2">
        <span className="label text-muted">ERROR 404</span>
        <h1 className="display text-4xl sm:text-6xl font-extrabold text-fg uppercase tracking-tight">
          THIS IDEA DOES NOT EXIST (YET).
        </h1>
        <p className="text-sm text-muted max-w-md mx-auto">
          The requested coordinate or recipe code could not be resolved in this reality.
        </p>
      </div>

      <Link href="/">
        <Button variant="solid" size="lg">
          SPIN A NEW IDEA →
        </Button>
      </Link>
    </div>
  );
}
