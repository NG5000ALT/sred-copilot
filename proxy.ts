import { clerkMiddleware } from "@clerk/nextjs/server";

// Sets up the Clerk session only. Authorization happens in every page, route handler and
// server action through requirePermission(), not by path matching here.
export default clerkMiddleware();

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
