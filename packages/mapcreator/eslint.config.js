import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

export default defineConfig([
  js.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "indent": ["error", 2], // Indentation de 2 espaces
      "react/jsx-indent": ["error", 2], // Indentation JSX de 2 espaces
      "react/jsx-indent-props": ["error", 2], // Indentation des props JSX de 2 espaces
      "react-hooks/rules-of-hooks": "error", // Vérifie les règles des Hooks
      "react-hooks/exhaustive-deps": "error", // Erreur sur les dépendances manquantes
    },
  },
]);
