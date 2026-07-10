export default function ScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-gradient-to-b from-indigo-50 via-slate-50 to-slate-100 px-4 py-10">
      {children}
    </main>
  );
}
