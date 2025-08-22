"use client";

import dynamic from 'next/dynamic';

// Dynamic import for ComprehensiveSettings component
const ComprehensiveSettings = dynamic(
  () => import('./comprehensive-settings').then(mod => ({ default: mod.ComprehensiveSettings })),
  {
    loading: () => <div>Loading settings...</div>,
    ssr: false
  }
);

// Re-export with the same name for easy replacement
export { ComprehensiveSettings };
export default ComprehensiveSettings;