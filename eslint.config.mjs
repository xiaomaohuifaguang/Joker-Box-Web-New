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
    // shadcn/ui 为 vendored 源码，其模式会触发 react-hooks 严格规则，不纳入 lint
    "components/ui/**",
    "hooks/use-mobile.ts",
    // tmp/ 为本地 scratch（截图 mock、临时脚本），不纳入 lint
    "tmp/**",
  ]),
]);

export default eslintConfig;
