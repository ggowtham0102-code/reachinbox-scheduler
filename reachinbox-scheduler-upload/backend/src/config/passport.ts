import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "./env";
import { prisma } from "../db/prisma";

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user ?? undefined);
  } catch (err) {
    done(err as Error);
  }
});

if (env.google.clientId && env.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.google.clientId,
        clientSecret: env.google.clientSecret,
        callbackURL: env.google.callbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("Google profile has no email"));

          const user = await prisma.user.upsert({
            where: { googleId: profile.id },
            update: {
              name: profile.displayName,
              avatarUrl: profile.photos?.[0]?.value,
            },
            create: {
              googleId: profile.id,
              name: profile.displayName,
              email,
              avatarUrl: profile.photos?.[0]?.value,
            },
          });
          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
} else {
  // eslint-disable-next-line no-console
  console.warn(
    "[auth] GOOGLE_CLIENT_ID/SECRET not set — Google login routes will 500 until configured."
  );
}

export default passport;
