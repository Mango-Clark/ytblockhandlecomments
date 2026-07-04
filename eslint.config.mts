import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { ignores: ["ytblockhandlecomments.js", "node_modules/**"] },
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.browser } },
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,mts}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-empty": ["error", { "allowEmptyCatch": true }]
    }
  },
  {
    files: ["scripts/**/*.ts", "tests/**/*.ts", "eslint.config.mts"],
    languageOptions: { globals: globals.node }
  }
]);
