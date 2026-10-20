/** A centred message for loading / error screens. */
export default function FullPageMessage({ children }) {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div role="status" className="max-w-sm text-center text-sm text-slate-700">{children}</div>
    </div>
  );
}
