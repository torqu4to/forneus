/**
 * Validation failures as translation keys, exactly like `ToolError` in the
 * Python core. The UI already knows how to render `{key, params}` — that is
 * what the API used to send — so moving the solver into the browser changes
 * nothing about how an error reaches the screen.
 */
export class ToolError extends Error {
  readonly key: string;
  readonly params: Record<string, string | number>;

  constructor(key: string, params: Record<string, string | number> = {}) {
    super(key);
    this.name = 'ToolError';
    this.key = key;
    this.params = params;
  }
}
