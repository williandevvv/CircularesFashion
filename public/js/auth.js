import { auth, onAuthStateChanged, signOut } from "./firebase-config.js";

export const ensureSession = () =>
  new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        const email = prompt("Email corporativo:");
        const pass = prompt("Contraseña:");
        if (!email || !pass) {
          window.location.reload();
          return;
        }
        const { signInWithEmailAndPassword } = await import("./firebase-config.js");
        await signInWithEmailAndPassword(auth, email, pass);
      }

      const currentUser = auth.currentUser;
      await currentUser.getIdToken(true);
      const claims = (await currentUser.getIdTokenResult()).claims;
      resolve({ user: currentUser, role: claims.role || "tienda" });
    });
  });

export const guardAdminRoute = async () => {
  const session = await ensureSession();
  if (session.role !== "admin") {
    window.location.href = "./index.html";
    return null;
  }
  return session;
};

export const bindLogout = (buttonId = "logoutBtn") => {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.reload();
  });
};
