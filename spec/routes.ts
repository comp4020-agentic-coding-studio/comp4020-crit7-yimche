// The routes the invariants run against. When you add a page, add its route
// here, or the invariants stop covering it.
// The account pages (/account/, /book/, /tickets/:id/) redirect when signed
// out, so they aren't 200 for an anonymous fetch; the invariants cover the
// public pages, and spec/accounts.test.ts drives the signed-in flow.
export const ROUTES = ["/", "/readme/", "/login/"];
