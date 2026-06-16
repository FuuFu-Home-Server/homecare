export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface RouteCtx {
  params: Promise<Record<string, string>>;
}

export type RouteHandler = (req: Request, ctx: RouteCtx) => Promise<Response>;

/**
 * Single typed boundary between the generic IPC dispatcher and the route modules.
 * Each route handler is typed with its own exact params ({ id }, { visitId }, …);
 * the dispatcher resolves a generic Record that genuinely carries those keys at
 * runtime, so erasing the param shape here is sound. Confined to this one helper
 * rather than casting at every registration site.
 */
export function toRouteHandler<P>(
  fn: (req: Request, ctx: { params: Promise<P> }) => Promise<Response>,
): RouteHandler {
  return fn as unknown as RouteHandler;
}

export interface RouteEntry {
  routePath: string;
  regex: RegExp;
  paramNames: string[];
  handlers: Partial<Record<HttpMethod, RouteHandler>>;
}
