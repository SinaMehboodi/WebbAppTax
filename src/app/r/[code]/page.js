// Phase 7 — referral link redirect. The QR/short link encodes /r/<code> where
// `code` is a user's referralCode. We forward to signup with `?ref=<code>` so
// the new account is linked back to the inviter.
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function ReferralRedirect({ params }) {
  const { code } = await params;
  const inviter = await prisma.user.findUnique({ where: { referralCode: code } });
  if (!inviter) redirect("/signup");
  // Track click via PresentationLink too if one exists with same slug
  await prisma.presentationLink.updateMany({
    where: { slug: code },
    data: { clicks: { increment: 1 } },
  });
  redirect(`/signup?ref=${code}`);
}
