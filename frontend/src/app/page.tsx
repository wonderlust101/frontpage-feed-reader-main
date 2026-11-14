import { Suspense } from "react";
import { BackendStatus } from "@/components/backend-status";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
      <h1 className="text-3xl font-bold tracking-tight">Frontpage</h1>
      <Suspense
        fallback={<p className="text-sm text-text-tertiary">Checking backend…</p>}
      >
        <BackendStatus />
      </Suspense>
    </main>
  );
}
