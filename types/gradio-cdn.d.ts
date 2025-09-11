// types/gradio-cdn.d.ts
declare module "https://cdn.jsdelivr.net/npm/@gradio/client/+esm" {
  export const client: (space: string) => Promise<any>;
}
