import { ClientNdaCreator } from "@/components/nda/ClientNdaCreator";
import { loadStandardTerms } from "@/lib/nda/loadStandardTerms";

const sections = loadStandardTerms();

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <p className="text-sm font-semibold text-indigo-600">Prelegal</p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Mutual NDA Creator
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Fill in the key details and download a completed Common Paper Mutual
            Non-Disclosure Agreement.
          </p>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-8">
        <ClientNdaCreator sections={sections} />
      </main>
    </div>
  );
}
