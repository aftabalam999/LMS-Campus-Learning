declare module 'marked' {
  export function parse(markdown: string): string;
  export const marked: {
    parse: (markdown: string) => string;
  };
  export default marked;
}
