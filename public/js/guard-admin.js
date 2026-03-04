// ============================================================
// GUARD ADMIN — protege admin.html, redirige si no es admin
// ============================================================
import { onAuth, getUserProfile } from "./auth.js";

export function guardAdmin() {
  return new Promise(resolve => {
    const unsub = onAuth(async user => {
      unsub();
      if (!user) { location.replace("./index.html"); return; }
      const profile = await getUserProfile(user.uid);
      if (!profile || profile.role !== "admin" || !profile.isActive) {
        location.replace("./index.html"); return;
      }
      resolve(profile);
    });
  });
}
