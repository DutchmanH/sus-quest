import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Async setState-in-effect patterns (e.g. calling a useCallback that fetches then sets state)
      // are flagged as errors by react-hooks v5 but are safe here. Downgrade to warning.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);

export default eslintConfig;
