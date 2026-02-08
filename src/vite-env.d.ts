/// <reference types="vite/client" />

// Augment Vite env typing for this repo.
interface ImportMetaEnv {
  readonly VITE_SHOW_LABS?: string;
  readonly VITE_ENABLE_PROPOSAL_COMMIT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

