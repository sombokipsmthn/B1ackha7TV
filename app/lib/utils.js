(function (root) {
  'use strict';
  function cn() { return Array.prototype.slice.call(arguments).filter(Boolean).join(' '); }
  root.cn = cn;
  root.ShadcnUtils = { cn: cn };
  if (typeof module !== 'undefined' && module.exports) { module.exports = { cn: cn }; }
})(typeof window !== 'undefined' ? window : globalThis);
