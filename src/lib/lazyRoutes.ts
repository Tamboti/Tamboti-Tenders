// Centralizes the dynamic imports behind the admin/portal routes, so
// App.tsx's lazy() calls and AppLayout's background prefetch reference the
// exact same import — the prefetch only actually saves a network request
// if Vite resolves both to the same chunk.
export const loadAlerts = () => import("@/pages/Alerts");
export const loadSources = () => import("@/pages/Sources");
export const loadBookmarks = () => import("@/pages/Bookmarks");
export const loadBilling = () => import("@/pages/Billing");
export const loadPostsAdmin = () => import("@/pages/admin/PostsAdmin");
export const loadAnalytics = () => import("@/pages/admin/Analytics");
export const loadAdminUsers = () => import("@/pages/admin/Users");

export const ADMIN_PORTAL_CHUNK_LOADERS = [
  loadAlerts,
  loadSources,
  loadBookmarks,
  loadBilling,
  loadPostsAdmin,
  loadAnalytics,
  loadAdminUsers,
];
