// Narrow Express's request param typing so handlers don't have to deal with
// the `string | string[]` shape that path-to-regexp v6 introduces for routes
// with optional or wildcard segments. We don't use those, so a flat
// Record<string, string> is the truthful surface.

import "express-serve-static-core";

declare module "express-serve-static-core" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ParamsDictionary {
    [key: string]: string;
  }

  // Override the inferred RouteParameters used by `router.get("/:id", …)`.
  // Each route param is always a plain string in our handlers.
  type RouteParameters<_Route extends string> = Record<string, string>;
}
