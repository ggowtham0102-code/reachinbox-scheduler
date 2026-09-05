import { Router } from "express";
import passport from "../config/passport";
import { env } from "../config/env";

import { prisma } from "../db/prisma";

export const authRouter = Router();

authRouter.get("/google", async (req, res, next) => {
  if (!env.google.clientId || !env.google.clientSecret) {
    try {
      const user = await prisma.user.upsert({
        where: { googleId: "demo-google-id" },
        update: { name: "Demo User" },
        create: {
          googleId: "demo-google-id",
          name: "Demo User",
          email: "demo@reachinbox.com",
          avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Demo",
        },
      });
      if (req.session) {
        (req.session as any).passport = { user: user.id };
      }
      return res.redirect(`${env.frontendUrl}/dashboard`);
    } catch (err) {
      return next(err);
    }
  }
  return passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${env.frontendUrl}/login?error=google_auth_failed`,
  }),
  (_req, res) => {
    res.redirect(`${env.frontendUrl}/dashboard`);
  }
);

authRouter.post("/logout", (req, res) => {
  req.logout(() => {
    res.json({ ok: true });
  });
});

authRouter.get("/me", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({ user: req.user });
  }
  res.status(401).json({ user: null });
});
