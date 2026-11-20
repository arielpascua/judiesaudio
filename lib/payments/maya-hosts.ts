// Client-safe: shared by the server's link builder and by the checkout UI's
// last-line check before it navigates the browser anywhere. One list, so the
// two cannot drift apart.
//
// The sets block ACCIDENTAL mutation only: Object.freeze alone does not stop
// Set.prototype.add, so add/delete/clear are replaced with ones that throw. This
// is a guard against a stray call, not a security boundary: code that can run in
// this process can still reach Set.prototype.add.call(set, ...) or redefine the
// property. The real protection is that the allowlist is a literal in this file.

function frozenSet(values: readonly string[]): ReadonlySet<string> {
  const set = new Set(values);
  const refuse = (): never => {
    throw new TypeError('This host set is immutable');
  };
  Object.defineProperties(set, {
    add: { value: refuse },
    delete: { value: refuse },
    clear: { value: refuse },
  });
  return Object.freeze(set);
}

export const MAYA_ALLOWED_HOSTS: ReadonlySet<string> = frozenSet([
  'mymaya.me',
  'sandbox.mymaya.me',
  // Maya also issues live payment links on the legacy PayMaya domain.
  'paymaya.me',
  'sandbox.paymaya.me',
]);

export const MAYA_SANDBOX_HOSTS: ReadonlySet<string> = frozenSet([
  'sandbox.mymaya.me',
  'sandbox.paymaya.me',
]);
