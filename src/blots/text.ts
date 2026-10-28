import { TextBlot } from '../parchment/parchment.js';

class Text extends TextBlot {}

// Escape text and attribute values for HTML serialization.
const entityMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeText(text: string) {
  return text.replace(/[&<>"']/g, (s) => entityMap[s]);
}

export { Text as default, escapeText };
