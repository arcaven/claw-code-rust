import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-24">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-4xl font-semibold tracking-tight text-fd-foreground sm:text-5xl">
          Devo documentation
        </h1>
        <p className="text-lg leading-8 text-fd-muted-foreground">
          A Next.js and Fumadocs web project for the Devo coding agent.
        </p>
        <Link
          href="/docs"
          className="inline-flex h-10 items-center justify-center rounded-md bg-fd-primary px-4 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
        >
          Open docs
        </Link>
      </div>
    </main>
  );
}
