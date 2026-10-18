declare module "jsdom" {
  export class JSDOM {
    constructor(html?: string, options?: { runScripts?: "dangerously" | "outside-only" });
    window: Window & { [key: string]: unknown };
  }
}
