// Compatibility shim for Shadcn-style imports
// Many UI components import from "@/lib/utils" expecting a `cn` helper.
// Our project keeps utilities under src/uticdls/admin-frontend-utils.ts.
// Re-export `cn` here to satisfy those imports without changing component code.

export { cn } from "../utils/admin-frontend-utils";
