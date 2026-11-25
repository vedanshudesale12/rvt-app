import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4">
      <div>
        <h1 className="display text-4xl">Not on the list</h1>
        <Link href="/" className="mt-4 inline-block underline">Back</Link>
      </div>
    </main>
  );
}
