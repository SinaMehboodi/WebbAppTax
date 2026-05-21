// Phase 2 — first-login tutorial. 4 sections, skippable. Marks
// firstLoginTutorialSeen on the user record when finished so it isn't shown
// again (per spec §5 module 4 "first_login_tutorial_seen = true / false").
import { getDictionary } from "@/lib/dictionary";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import TutorialClient from "./TutorialClient";

export default async function TutorialPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { t } = await getDictionary();
  const steps = [1, 2, 3, 4].map((i) => ({
    title: t(`tutorial.step${i}Title`),
    body: t(`tutorial.step${i}Body`),
  }));
  return (
    <TutorialClient
      steps={steps}
      title={t("tutorial.title")}
      subtitle={t("tutorial.subtitle")}
      next={t("tutorial.next")}
      prev={t("tutorial.prev")}
      skip={t("tutorial.skip")}
      finish={t("tutorial.finish")}
    />
  );
}
