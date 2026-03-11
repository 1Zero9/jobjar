export async function register() {
  // Only run on the server runtime, not during build
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.NODE_ENV === "production") {
      if (!process.env.SESSION_SIGNING_SECRET && !process.env.NEXTAUTH_SECRET) {
        throw new Error(
          "[JobJar] SESSION_SIGNING_SECRET must be set in production. " +
            "Add this environment variable before deploying.",
        );
      }
      if (!process.env.HOUSEHOLD_PASSCODE) {
        console.warn(
          "[JobJar] HOUSEHOLD_PASSCODE is not set. " +
            "Users without a stored password hash will not be able to authenticate.",
        );
      }
    }
  }
}
