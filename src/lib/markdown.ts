import MarkdownIt from "markdown-it";

// renderInline: no <p> wrapper, good for short strings like your install_custom lines
// render: full block parsing, good for longer content
const md = new MarkdownIt({
  html: false,      // don't allow raw HTML in the yaml strings (safer)
  linkify: true,     // auto-link bare URLs
  breaks: true,      // \n -> <br>, optional, matches typical yaml multiline behavior
});

export function renderMarkdown(text: string): string {
  return md.render(text);
}

export function renderMarkdownInline(text: string): string {
  return md.renderInline(text);
}
