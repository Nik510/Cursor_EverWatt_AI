export function ModuleHubShip() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">EverWatt Engine</h1>
          <p className="text-gray-600 mt-2">Ship-slice build: core tools only.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="text-sm text-gray-700">
            This build is intentionally limited to the hardened platform surface (auth + AI safety + CI gates).
          </div>
        </div>
      </div>
    </div>
  );
}

