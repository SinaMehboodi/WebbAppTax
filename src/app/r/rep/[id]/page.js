// QR redirect for sales reps. The QR encodes /r/rep/<repId> so we can bump a
// click counter and forward to the signup page with the rep prefilled.
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function RepQrRedirect({ params }) {
  const { id } = await params;
  const rep = await prisma.user.findUnique({ where: { id } });
  if (!rep) redirect("/signup");
  redirect(`/signup?rep=${rep.id}`);
}
