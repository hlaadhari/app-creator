declare module "jsdom" {
  export class JSDOM {
    constructor(
      html?: string,
      options?: {
        runScripts?: "dangerously" | "outside-only";
        beforeParse?: (win: Window & { [key: string]: unknown }) => void;
      },
    );
    window: Window & { [key: string]: unknown };
  }
}
