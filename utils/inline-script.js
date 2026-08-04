'use strict';

// JSON is valid JavaScript data, but a literal </script> still terminates an
// HTML script element before the JavaScript parser sees it. Escape HTML-significant
// characters and JavaScript line separators before embedding any value.
function serializeForInlineScript(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, character => {
    const code = character.charCodeAt(0).toString(16).padStart(4, '0');
    return `\\u${code}`;
  });
}

module.exports = { serializeForInlineScript };
