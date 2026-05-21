// Assembles the SamTaxco user guide PDF.
//
// Inputs:
//   - docs/screenshots/*.png  (captured by capture-screenshots.mjs)
//
// Output:
//   - docs/SamTaxco-UserGuide.pdf
//
// Layout per screen-chapter:
//   - Section heading
//   - Subhead / intro paragraph
//   - The screenshot, scaled to fit the page, with numbered callout circles
//     drawn on top at the coordinates specified in CHAPTERS
//   - A bullet list explaining each numbered element
//
// Run with:  node scripts/generate-user-guide.mjs
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const SHOT_DIR = path.resolve("docs/screenshots");
const OUT_FILE = path.resolve("docs/SamTaxco-UserGuide.pdf");

// A4 portrait in pt
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 42;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 56;
const CONTENT_W = PAGE_W - 2 * MARGIN_X;

// Colours
const C = {
  brand:    rgb(0.0627, 0.7255, 0.5059), // emerald-500
  brandDk:  rgb(0.0235, 0.5882, 0.4118), // emerald-600
  text:     rgb(0.1098, 0.0980, 0.0902),
  muted:    rgb(0.3412, 0.3255, 0.3059),
  panel:    rgb(0.9608, 0.9608, 0.9412), // surface-2
  border:   rgb(0.9059, 0.8980, 0.8784),
  white:    rgb(1, 1, 1),
  amber:    rgb(0.9608, 0.6196, 0.0431),
  rose:     rgb(0.8941, 0.2118, 0.3373),
  sky:      rgb(0.0549, 0.6471, 0.9137),
  violet:   rgb(0.5451, 0.3608, 0.9647),
  callout:  rgb(0.0235, 0.5882, 0.4118),
};

// Each chapter renders on its own pair of pages: cover (heading + intro) and
// content (screenshot + callouts).
//
// CALLOUT format: { x, y, label, text } where x/y are pixel coordinates IN
// THE ORIGINAL screenshot. We map them onto the placed image.
const CHAPTERS = [
  // -- PART I — Overview --------------------------------------------------
  {
    part: "I",
    partTitle: "Vue d'ensemble",
    title: "Bienvenue dans SamTaxco",
    subtitle: "Comment lire ce manuel",
    intro:
      "SamTaxco est une application web et mobile (PWA) pour gérer les impôts " +
      "directs locaux français : Taxe Foncière et CFE. Ce manuel décrit chaque " +
      "écran, en commençant par le client final, puis l'équipe Samuel, puis " +
      "l'administration. Chaque écran est accompagné d'une capture annotée : " +
      "les numéros (1) (2) (3) sur l'image renvoient aux explications " +
      "numérotées en dessous.",
    extraText: [
      "",
      "Les quatre rôles :",
      "",
      "  • USER (client) — le contribuable. Voit ses dossiers, signe " +
        "électroniquement, dépose ses pièces, suit ses factures.",
      "",
      "  • EMPLOYEE — votre équipe commerciale. Chaque permission est " +
        "réglée individuellement (cases vertes/rouges dans le panneau " +
        "« Permissions »).",
      "",
      "  • ADMIN — chef de service. A toutes les permissions employé sauf " +
        "celles marquées « super-admin uniquement ». Peut octroyer des " +
        "permissions aux employés.",
      "",
      "  • SUPER_ADMIN — vous (ou le développeur). Tout pouvoir, y compris " +
        "supprimer un dossier ou un compte. Réservé aux situations critiques.",
    ],
  },

  // -- PART II — Le client ------------------------------------------------
  {
    part: "II",
    partTitle: "Le client (USER)",
    title: "Page d'accueil publique",
    subtitle: "Ce que voit un visiteur non connecté",
    image: "01-landing-mobile.png",
    callouts: [
      { x: 60,  y: 50,  text: "Logo SamTaxco — un clic ramène à l'accueil." },
      { x: 540, y: 50,  text: "Bouton « Créer un compte » — pour s'inscrire." },
      { x: 270, y: 320, text: "Titre principal et accroche commerciale." },
      { x: 270, y: 770, text: "Boutons d'appel à l'action (créer un compte / découvrir le service)." },
    ],
  },
  {
    title: "Connexion",
    subtitle: "L'écran de login : mot de passe + biométrie + « Rester connecté »",
    image: "03-login.png",
    callouts: [
      { x: 200, y: 280, text: "Champs e-mail et mot de passe avec œil (i) pour révéler la saisie." },
      { x: 200, y: 480, text: "« Rester connecté sur cet appareil (90 jours) » : prolonge la session de 30 à 90 jours." },
      { x: 200, y: 620, text: "Bouton principal « Se connecter »." },
      { x: 200, y: 740, text: "« Se connecter avec Face ID / Touch ID / empreinte » : connexion biométrique sans mot de passe (à activer depuis Mon compte)." },
      { x: 200, y: 860, text: "« Mot de passe oublié ? » : envoie un lien de réinitialisation par e-mail." },
    ],
  },
  {
    title: "Création de compte",
    subtitle: "Inscription d'un nouveau client",
    image: "04-signup.png",
    callouts: [
      { x: 200, y: 220, text: "Identité du client : nom, prénom, e-mail, téléphone (optionnel)." },
      { x: 200, y: 560, text: "Mot de passe (8 caractères minimum) + confirmation." },
      { x: 200, y: 780, text: "Bouton « Créer mon compte » — un e-mail de vérification est envoyé avec un code à 6 chiffres valable 24 h." },
    ],
  },
  {
    title: "Mot de passe oublié",
    subtitle: "Réinitialisation par e-mail",
    image: "05-forgot-password.png",
    callouts: [
      { x: 200, y: 350, text: "Saisir l'e-mail du compte." },
      { x: 200, y: 480, text: "Un lien sécurisé est envoyé. Validité : 1 heure." },
      { x: 200, y: 600, text: "Note : pour des raisons de sécurité, la réponse est toujours « ok » que l'e-mail existe ou non (pas d'information sur l'existence du compte)." },
    ],
  },
  {
    title: "Tableau de bord du client",
    subtitle: "Premier écran après connexion",
    image: "06-client-dashboard.png",
    callouts: [
      { x: 220, y: 160, text: "Bandeau de bienvenue avec la date du jour et le nom du commercial référent." },
      { x: 220, y: 380, text: "« Déposer un nouvel impôt » (TF / CFE) — bouton principal pour démarrer un nouveau dossier." },
      { x: 220, y: 580, text: "Nombre de dossiers en cours (les dossiers terminés / annulés ne sont pas comptés)." },
      { x: 220, y: 700, text: "Notifications non lues — la pastille amber indique un nouveau message." },
      { x: 220, y: 870, text: "Actions à faire : items urgents nécessitant l'attention du client (signature attendue, documents demandés, etc.)." },
      { x: 380, y: 1500, text: "Barre de navigation inférieure : Tableau de bord · Mes dossiers · + (nouveau) · Notifications · Parrainage." },
    ],
  },
  {
    title: "Mes dossiers",
    subtitle: "Liste des dossiers du client",
    image: "07-client-cases.png",
    callouts: [
      { x: 580, y: 130, text: "Bouton « + Déposer un nouvel impôt » dans le coin supérieur droit." },
      { x: 380, y: 320, text: "Chaque carte : nom du bien, année, référence (TF-AAAA-NNNN), statut côté client (libellé simplifié)." },
      { x: 580, y: 320, text: "Pastille de statut — couleurs : vert (actif/réussi), ambre (à faire), bleu (en attente), gris (terminé), rouge (annulé)." },
    ],
  },
  {
    title: "Détail d'un dossier — en attente",
    subtitle: "Cas TF-2026-0001 (statut « Brouillon » côté admin = « En attente » côté client)",
    image: "08-client-case-pending.png",
    callouts: [
      { x: 220, y: 200, text: "En-tête : nom du bien, référence et type d'impôt." },
      { x: 220, y: 420, text: "Bannière sky-blue « Votre dossier est en cours de traitement » — texte rassurant en attendant que l'équipe prépare le contrat." },
      { x: 220, y: 750, text: "Carte « Votre interlocuteur » — affiche le ou les commerciaux affectés au dossier, avec * pour le responsable principal." },
      { x: 220, y: 1050, text: "Sections Documents, Activité, Commentaires (vides à ce stade)." },
    ],
  },
  {
    title: "Détail d'un dossier — documents demandés",
    subtitle: "L'équipe a demandé des pièces complémentaires",
    image: "09-client-case-awaiting-docs.png",
    callouts: [
      { x: 580, y: 250, text: "Statut « Documents demandés » en orange." },
      { x: 380, y: 480, text: "Section « Documents complémentaires demandés » avec la liste des pièces attendues." },
      { x: 380, y: 700, text: "Trois boutons pour envoyer : [Photo] Photo (camera native), [Gallery] Galerie, [PDF] PDF." },
      { x: 380, y: 1100, text: "« Vous n'avez pas le plan ? Demander une visite et relevé sur place » : déclenche une demande à l'équipe." },
    ],
  },
  {
    title: "Mon compte",
    subtitle: "Page de paramètres pour tout utilisateur",
    image: "10-client-account.png",
    callouts: [
      { x: 220, y: 280, text: "Profil : avatar avec initiales, nom complet, e-mail, rôle." },
      { x: 220, y: 580, text: "« Connexion biométrique » — activer Face ID / Touch ID / empreinte sur cet appareil. Liste des appareils enrôlés avec date de dernière utilisation." },
      { x: 220, y: 1000, text: "« Changer mon mot de passe » : demande le mot de passe actuel + le nouveau (× 2). Détecte automatiquement si le nouveau = ancien." },
      { x: 220, y: 1500, text: "Lien « Recevoir un lien par e-mail » si le client a oublié son mot de passe actuel." },
    ],
  },
  {
    title: "Notifications & installation PWA",
    subtitle: "Page de notifications avec la carte d'installation iPhone / Android",
    image: "11-client-notifications.png",
    callouts: [
      { x: 580, y: 130, text: "Compteur d'unread + bouton « Tout marquer comme lu »." },
      { x: 380, y: 320, text: "Carte « Recevoir les alertes sur ce téléphone » — bouton « Activer » pour souscrire aux notifications push (Android et iPhone installé à l'écran d'accueil)." },
      { x: 380, y: 500, text: "Liste des notifications avec date, titre, lien vers le dossier concerné." },
    ],
  },

  // -- PART III — L'équipe (Samuel + employés) -----------------------------
  {
    part: "III",
    partTitle: "L'équipe (EMPLOYEE)",
    title: "Tableau de bord du back-office",
    subtitle: "Vue d'accueil pour les employés (et au-dessus)",
    image: "20-admin-workflow.png",
    callouts: [
      { x: 95,  y: 50,  text: "Logo + nom de l'utilisateur connecté en bas de la barre latérale." },
      { x: 95,  y: 240, text: "Navigation principale : Tableau de bord, Boîte de réception, Tous les dossiers, Rapports, Utilisateurs, Contenu de présentation." },
      { x: 600, y: 100, text: "Bandeau de bienvenue avec la date." },
      { x: 600, y: 280, text: "Tuiles de stats : Clients, Dossiers, CA encaissé HT." },
      { x: 600, y: 500, text: "Charge de travail par étape du workflow : En attente de contrat, signature, documents, analyse, décision, facture." },
      { x: 600, y: 720, text: "Flux d'activité récente — clic sur un dossier pour s'y rendre." },
    ],
  },
  {
    title: "Boîte de réception",
    subtitle: "Dossiers en attente de préparation de contrat",
    image: "21-admin-inbox.png",
    callouts: [
      { x: 700, y: 130, text: "Titre et sous-titre rappellent la fonction de cet écran." },
      { x: 700, y: 340, text: "Carte par dossier : nom du bien, référence, client, nombre de documents reçus, lien « Préparer > »." },
    ],
  },
  {
    title: "Tous les dossiers",
    subtitle: "Vue d'ensemble avec filtres par statut",
    image: "22-admin-cases.png",
    callouts: [
      { x: 700, y: 60,  text: "Titre + compteur de dossiers affichés." },
      { x: 700, y: 180, text: "Chips de filtre par statut — « Tous », ou clic sur n'importe quel statut pour ne voir que ces dossiers." },
      { x: 380, y: 380, text: "Cartes : nom du bien, référence, statut, client, année, responsable." },
    ],
  },
  {
    title: "Espace de travail d'un dossier",
    subtitle: "L'écran central de l'équipe — toutes les actions sur un dossier",
    image: "23-admin-case-workspace.png",
    callouts: [
      { x: 700, y: 90,  text: "En-tête du dossier : référence, propriété, client, type/année, statut." },
      { x: 700, y: 320, text: "Section disponible selon le statut + les permissions. Ici : « Demander des documents complémentaires »." },
      { x: 700, y: 540, text: "« Clôturer ce dossier » — trois boutons : v Terminer avec succès, (II) Arrêter (avec raison), x Annuler (avec raison). Le client est notifié." },
      { x: 1100, y: 180, text: "Carte « Équipe affectée » : liste des employés, * pour le responsable principal, boutons « Principal » / « Retirer » selon les permissions, + « Ajouter un membre »." },
      { x: 1100, y: 540, text: "Activité du dossier en temps réel (audit log)." },
      { x: 1100, y: 720, text: "Commentaires (visibles client + internes équipe)." },
    ],
  },
  {
    title: "Rapports",
    subtitle: "Recherche avancée et statistiques",
    image: "24-admin-reports.png",
    callouts: [
      { x: 800, y: 90,  text: "Titre + bouton « Exporter CSV » (visible si la permission reports.export est accordée)." },
      { x: 800, y: 220, text: "Quatre KPIs : Dossiers, Économies estimées, CA facturé HT, Encaissé TTC. Mis à jour selon les filtres ci-dessous." },
      { x: 800, y: 420, text: "Barre de recherche rapide + bouton « Avancée » pour ouvrir le panneau de filtres complets (dates, statuts, type d'impôt, responsable, archivés, économies min/max)." },
      { x: 800, y: 580, text: "Tableau des résultats avec colonnes triées par dernière mise à jour. Clic sur la référence pour ouvrir le dossier." },
    ],
  },
  {
    title: "Contenu de présentation",
    subtitle: "Gestion des slides de la présentation commerciale",
    image: "25-admin-presentation.png",
    callouts: [
      { x: 800, y: 60,  text: "Bouton « + Nouvelle slide » (permission presentation.edit)." },
      { x: 800, y: 250, text: "Liste des slides avec leur ordre, slug (identifiant), titre FR / EN. Clic pour modifier." },
      { x: 800, y: 350, text: "Modifier (et éventuellement supprimer si permission accordée) chaque slide via la page d'édition." },
    ],
  },

  // -- PART IV — Administration -------------------------------------------
  {
    part: "IV",
    partTitle: "Administration (ADMIN / SUPER_ADMIN)",
    title: "Utilisateurs",
    subtitle: "Liste complète des comptes : clients, équipe, admins",
    image: "30-superadmin-users.png",
    callouts: [
      { x: 800, y: 50,  text: "Boutons d'action : « + Inscrire un client » (permission users.create_client) et « + Nouvel employé » (permission users.create, super-admin uniquement)." },
      { x: 800, y: 180, text: "Tuiles de stats : Clients, Commerciaux, Admin, Désactivés." },
      { x: 200, y: 380, text: "Tableau : Nom, Email, Type (rôle), Commercial référent, Nb. de dossiers, Vérifié." },
      { x: 800, y: 420, text: "Actions par ligne : Permissions, Éditer / Mot de passe / Supprimer (selon les permissions du connecté), Désactiver / Réactiver." },
    ],
  },
  {
    title: "Permissions d'un employé",
    subtitle: "Réglage par employé — feux verts (accordé) / rouges (bloqué)",
    image: "31-superadmin-permissions.png",
    callouts: [
      { x: 700, y: 90,  text: "En-tête : nom de l'employé + e-mail + rôle." },
      { x: 700, y: 280, text: "Onglets par catégorie : Dossiers, Présentation, Rapports, Équipe & clients. Chaque onglet affiche le nombre de permissions actives." },
      { x: 700, y: 480, text: "Pour chaque permission : description claire + identifiant technique en gris (ex. case.close)." },
      { x: 1000, y: 500, text: "Toggle rouge/vert — vert = activé, rouge = bloqué. Un clic bascule." },
      { x: 700, y: 880, text: "Barre d'enregistrement collante en bas — affiche « Modifications non enregistrées » tant que l'on n'a pas cliqué « Enregistrer »." },
    ],
  },

  // -- PART V — Mobile -----------------------------------------------------
  {
    part: "V",
    partTitle: "Mobile",
    title: "Le back-office sur mobile",
    subtitle: "Samuel ou un employé consulte le back-office depuis son téléphone",
    image: "40-samuel-mobile-workflow.png",
    callouts: [
      { x: 200, y: 80,  text: "Bouton [menu] pour ouvrir le menu latéral (Tableau de bord, Boîte, etc.)." },
      { x: 200, y: 300, text: "Bandeau de bienvenue identique à la version desktop, adapté à la largeur du téléphone." },
      { x: 200, y: 500, text: "KPIs empilés verticalement sur mobile." },
    ],
  },
];

// ---------------------------------------------------------------------------
async function main() {
  const pdf = await PDFDocument.create();
  pdf.setTitle("SamTaxco — Manuel utilisateur");
  pdf.setAuthor("SamTaxco");
  pdf.setCreator("SamTaxco user guide generator");
  pdf.setProducer("pdf-lib");
  pdf.setCreationDate(new Date());

  const fontReg  = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontIt   = await pdf.embedFont(StandardFonts.HelveticaOblique);

  // -- Cover page ----------------------------------------------------------
  {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    // Brand band
    page.drawRectangle({ x: 0, y: PAGE_H - 220, width: PAGE_W, height: 220, color: C.brand });
    // Title block
    page.drawText("SamTaxco", { x: MARGIN_X, y: PAGE_H - 130, size: 56, font: fontBold, color: C.white });
    page.drawText("Manuel utilisateur", { x: MARGIN_X, y: PAGE_H - 175, size: 22, font: fontReg, color: C.white });
    page.drawText("Édition " + new Date().toLocaleDateString("fr-FR"), {
      x: MARGIN_X, y: PAGE_H - 200, size: 11, font: fontIt, color: rgb(0.9, 1, 0.95),
    });

    // Intro paragraph
    const introY = PAGE_H - 290;
    drawParagraph(page, fontReg, [
      "Ce document décrit chaque écran de l'application SamTaxco, du point de",
      "vue de chacun des quatre rôles : USER (client), EMPLOYEE (commercial),",
      "ADMIN (chef de service) et SUPER_ADMIN (administrateur technique).",
      "",
      "Chaque capture d'écran porte des numéros encadrés (1) (2) (3) qui renvoient",
      "à des explications numérotées en dessous. Suivez les numéros dans",
      "l'ordre pour apprendre l'écran.",
    ], MARGIN_X, introY, 12, 16, C.text);

    // Roles cheat sheet
    let y = PAGE_H - 460;
    drawHeading(page, fontBold, "Les quatre rôles en bref", MARGIN_X, y, 16, C.text);
    y -= 30;
    const roleRows = [
      ["SUPER_ADMIN", "Vous (ou le développeur). Tous les pouvoirs, y compris suppression. À utiliser avec parcimonie."],
      ["ADMIN",       "Chef de service. Permissions employé étendues, mais ne peut ni supprimer ni créer des comptes."],
      ["EMPLOYEE",    "Commercial. Chaque action est protégée par une permission individuelle (rouge / verte)."],
      ["USER",        "Client final. Dépose ses pièces, signe, suit ses dossiers et factures."],
    ];
    for (const [role, desc] of roleRows) {
      page.drawText(role, { x: MARGIN_X, y, size: 11, font: fontBold, color: C.brandDk });
      const wrapped = wrap(fontReg, 11, desc, CONTENT_W - 110);
      for (const line of wrapped) {
        page.drawText(line, { x: MARGIN_X + 110, y, size: 11, font: fontReg, color: C.text });
        y -= 14;
      }
      y -= 6;
    }

    // Footer
    page.drawText("samtaxco.app — Manuel généré le " + new Date().toLocaleString("fr-FR"), {
      x: MARGIN_X, y: MARGIN_BOTTOM, size: 9, font: fontReg, color: C.muted,
    });
  }

  // -- Table of contents ---------------------------------------------------
  {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    drawSectionHeader(page, fontBold, fontReg, "Sommaire", MARGIN_TOP);
    let y = PAGE_H - MARGIN_TOP - 60;
    let partNum = 0;
    let chapterNum = 0;
    for (const ch of CHAPTERS) {
      if (ch.part) {
        partNum += 1;
        y -= 18;
        page.drawText(`PARTIE ${ch.part} · ${ch.partTitle}`, {
          x: MARGIN_X, y, size: 12, font: fontBold, color: C.brandDk,
        });
        y -= 18;
      }
      chapterNum += 1;
      page.drawText(`  ${String(chapterNum).padStart(2, "0")}.`, {
        x: MARGIN_X + 8, y, size: 11, font: fontBold, color: C.text,
      });
      page.drawText(ch.title, { x: MARGIN_X + 35, y, size: 11, font: fontReg, color: C.text });
      y -= 16;
    }
    drawFooter(page, fontReg, 2, "Sommaire");
  }

  // -- Chapters ------------------------------------------------------------
  let pageNum = 2;
  let chapterNum = 0;
  for (const ch of CHAPTERS) {
    chapterNum += 1;
    pageNum += 1;
    const page = pdf.addPage([PAGE_W, PAGE_H]);

    // Part divider (above title)
    let cursor = PAGE_H - MARGIN_TOP;
    if (ch.part) {
      page.drawRectangle({
        x: MARGIN_X, y: cursor - 4, width: 22, height: 3, color: C.brand,
      });
      page.drawText(`PARTIE ${ch.part} · ${ch.partTitle.toUpperCase()}`, {
        x: MARGIN_X + 30, y: cursor - 12, size: 9, font: fontBold, color: C.brandDk,
      });
      cursor -= 28;
    }

    // Chapter heading
    page.drawText(`${String(chapterNum).padStart(2, "0")}. ${ch.title}`, {
      x: MARGIN_X, y: cursor - 18, size: 18, font: fontBold, color: C.text,
    });
    cursor -= 36;
    if (ch.subtitle) {
      const subLines = wrap(fontIt, 11, ch.subtitle, CONTENT_W);
      for (const l of subLines) {
        page.drawText(l, { x: MARGIN_X, y: cursor, size: 11, font: fontIt, color: C.muted });
        cursor -= 14;
      }
      cursor -= 6;
    }

    // Intro / overview chapters don't have an image — handle as long text
    if (!ch.image && ch.intro) {
      const lines = wrap(fontReg, 12, ch.intro, CONTENT_W);
      for (const l of lines) {
        page.drawText(l, { x: MARGIN_X, y: cursor, size: 12, font: fontReg, color: C.text });
        cursor -= 16;
      }
      if (ch.extraText) {
        for (const raw of ch.extraText) {
          for (const l of wrap(fontReg, 11, raw, CONTENT_W)) {
            page.drawText(l, { x: MARGIN_X, y: cursor, size: 11, font: fontReg, color: C.text });
            cursor -= 14;
          }
        }
      }
      drawFooter(page, fontReg, pageNum, ch.title);
      continue;
    }

    // Image + callouts
    const imagePath = path.join(SHOT_DIR, ch.image);
    const bytes = await fs.readFile(imagePath);
    const img = await pdf.embedPng(bytes);
    const naturalW = img.width;
    const naturalH = img.height;

    // Compute scaled size to fit max ~340pt height and content width
    const maxImgW = CONTENT_W;
    const maxImgH = 360;
    let drawW = maxImgW;
    let drawH = (naturalH / naturalW) * drawW;
    if (drawH > maxImgH) {
      drawH = maxImgH;
      drawW = (naturalW / naturalH) * drawH;
    }
    const imgX = MARGIN_X + (CONTENT_W - drawW) / 2;
    const imgY = cursor - drawH - 6;

    // Image frame
    page.drawRectangle({
      x: imgX - 4, y: imgY - 4, width: drawW + 8, height: drawH + 8,
      color: C.panel, borderColor: C.border, borderWidth: 0.5,
    });
    page.drawImage(img, { x: imgX, y: imgY, width: drawW, height: drawH });

    // Callouts
    if (ch.callouts?.length) {
      const sx = drawW / naturalW;
      const sy = drawH / naturalH;
      ch.callouts.forEach((co, i) => {
        // Convert image-pixel coords to PDF pt within the placed image
        const cx = imgX + co.x * sx;
        const cy = imgY + drawH - co.y * sy; // PDF y axis is bottom-up
        drawCallout(page, fontBold, i + 1, cx, cy);
      });
    }

    cursor = imgY - 18;

    // Numbered explanations
    if (ch.callouts?.length) {
      for (let i = 0; i < ch.callouts.length; i++) {
        const co = ch.callouts[i];
        const num = String(i + 1);
        const numWidth = 18;
        // Draw number badge
        page.drawCircle({ x: MARGIN_X + 10, y: cursor + 4, size: 8, color: C.callout });
        page.drawText(num, {
          x: MARGIN_X + 10 - fontBold.widthOfTextAtSize(num, 8) / 2,
          y: cursor + 1,
          size: 8,
          font: fontBold,
          color: C.white,
        });
        // Text wrapped
        const lines = wrap(fontReg, 10, co.text, CONTENT_W - numWidth - 6);
        let lineY = cursor;
        for (const l of lines) {
          page.drawText(l, { x: MARGIN_X + numWidth + 6, y: lineY, size: 10, font: fontReg, color: C.text });
          lineY -= 13;
        }
        cursor = lineY - 6;
        if (cursor < MARGIN_BOTTOM + 30) break; // safety; overflow would need another page
      }
    }

    drawFooter(page, fontReg, pageNum, ch.title);
  }

  // -- Appendix : permissions reference ------------------------------------
  pageNum += 1;
  {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    drawSectionHeader(page, fontBold, fontReg, "Annexe — Référence des permissions", MARGIN_TOP);
    let y = PAGE_H - MARGIN_TOP - 60;

    const PERMS = [
      ["Dossiers", [
        ["case.prepare_contract", "Préparer le contrat et le mandat (formulaire)."],
        ["case.request_docs", "Demander des pièces complémentaires au client."],
        ["case.analyze", "Saisir l'analyse interne."],
        ["case.decide", "Soumettre la décision (proceeding / not proceeding / audit)."],
        ["case.record_result", "Enregistrer le résultat administratif."],
        ["case.invoice", "Émettre la facture."],
        ["case.mark_paid", "Marquer la facture comme payée."],
        ["case.close", "Terminer, arrêter ou annuler un dossier (avec raison)."],
        ["case.assign_self", "S'affecter à un dossier."],
        ["case.assign_others", "Affecter ou retirer d'autres employés."],
        ["case.view_all", "Voir tous les dossiers (sinon seulement ceux affectés)."],
      ]],
      ["Présentation", [
        ["presentation.edit", "Créer et modifier les slides."],
        ["presentation.delete", "Supprimer une slide."],
      ]],
      ["Rapports", [
        ["reports.view", "Ouvrir la page Rapports."],
        ["reports.export", "Exporter les résultats en CSV."],
      ]],
      ["Équipe & clients", [
        ["users.create_client", "Inscrire un nouveau client (envoie un e-mail d'activation)."],
        ["users.grant_perms", "Modifier les permissions d'autres employés."],
      ]],
      ["Super-admin uniquement", [
        ["users.create", "Créer un compte EMPLOYEE."],
        ["users.modify", "Modifier le nom / e-mail d'un compte."],
        ["users.reset_password", "Forcer la réinitialisation du mot de passe."],
        ["users.delete", "Supprimer un compte définitivement."],
        ["users.deactivate", "Désactiver / réactiver un compte."],
        ["case.delete", "Supprimer un dossier."],
        ["case.delete_files", "Supprimer un document protégé (contrat / mandat / facture / signé)."],
      ]],
    ];

    for (const [group, perms] of PERMS) {
      if (y < MARGIN_BOTTOM + 80) {
        const newPage = pdf.addPage([PAGE_W, PAGE_H]);
        drawSectionHeader(newPage, fontBold, fontReg, "Annexe — Référence des permissions (suite)", MARGIN_TOP);
        y = PAGE_H - MARGIN_TOP - 60;
        drawFooter(page, fontReg, pageNum, "Annexe permissions");
      }
      page.drawText(group, { x: MARGIN_X, y, size: 13, font: fontBold, color: C.brandDk });
      y -= 18;
      for (const [key, desc] of perms) {
        page.drawText(key, { x: MARGIN_X + 8, y, size: 9.5, font: fontBold, color: C.text });
        const keyW = fontBold.widthOfTextAtSize(key, 9.5);
        const lines = wrap(fontReg, 10, desc, CONTENT_W - keyW - 18);
        let lineY = y;
        for (let i = 0; i < lines.length; i++) {
          page.drawText(lines[i], {
            x: MARGIN_X + 8 + keyW + 10, y: lineY, size: 10, font: fontReg, color: C.text,
          });
          lineY -= 13;
        }
        y = lineY - 4;
      }
      y -= 10;
    }
    drawFooter(page, fontReg, pageNum, "Annexe permissions");
  }

  // -- End -----------------------------------------------------------------
  const bytes = await pdf.save();
  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, bytes);
  console.log(`Wrote ${OUT_FILE} — ${(bytes.length / 1024).toFixed(1)} KB · ${pdf.getPageCount()} pages`);
}

// -- Helpers -----------------------------------------------------------------
function wrap(font, size, text, maxW) {
  const out = [];
  for (const para of String(text || "").split("\n")) {
    const words = para.split(/\s+/);
    let line = "";
    for (const w of words) {
      const tentative = line ? line + " " + w : w;
      if (font.widthOfTextAtSize(tentative, size) > maxW && line) {
        out.push(line);
        line = w;
      } else line = tentative;
    }
    if (line) out.push(line);
    if (words.length === 0) out.push("");
  }
  return out;
}

function drawParagraph(page, font, lines, x, y, size, lineHeight, color) {
  let cy = y;
  for (const raw of lines) {
    for (const l of wrap(font, size, raw, PAGE_W - 2 * MARGIN_X)) {
      page.drawText(l, { x, y: cy, size, font, color });
      cy -= lineHeight;
    }
  }
  return cy;
}

function drawHeading(page, font, text, x, y, size, color) {
  page.drawText(text, { x, y, size, font, color });
}

function drawSectionHeader(page, fontBold, fontReg, title, topMargin) {
  const page_w = page.getWidth();
  // Top brand bar
  page.drawRectangle({ x: 0, y: page.getHeight() - 40, width: page_w, height: 40, color: C.brand });
  page.drawText("SamTaxco", { x: MARGIN_X, y: page.getHeight() - 27, size: 12, font: fontBold, color: C.white });
  page.drawText("Manuel utilisateur", { x: page_w - MARGIN_X - 90, y: page.getHeight() - 27, size: 10, font: fontReg, color: C.white });
  // Section title
  page.drawText(title, {
    x: MARGIN_X, y: page.getHeight() - topMargin, size: 22, font: fontBold, color: C.text,
  });
  page.drawRectangle({
    x: MARGIN_X, y: page.getHeight() - topMargin - 12, width: 60, height: 3, color: C.brand,
  });
}

function drawFooter(page, font, pageNum, sectionLabel) {
  const pw = page.getWidth();
  page.drawLine({
    start: { x: MARGIN_X, y: MARGIN_BOTTOM - 12 },
    end:   { x: pw - MARGIN_X, y: MARGIN_BOTTOM - 12 },
    thickness: 0.4, color: C.border,
  });
  page.drawText(sectionLabel || "SamTaxco", {
    x: MARGIN_X, y: MARGIN_BOTTOM - 28, size: 8, font, color: C.muted,
  });
  const label = `Page ${pageNum}`;
  page.drawText(label, {
    x: pw - MARGIN_X - font.widthOfTextAtSize(label, 8),
    y: MARGIN_BOTTOM - 28, size: 8, font, color: C.muted,
  });
}

// A circled white-on-emerald number drawn on top of a screenshot.
function drawCallout(page, fontBold, n, x, y) {
  const r = 11;
  // White outer ring (so it pops against dark backgrounds)
  page.drawCircle({ x, y, size: r + 2, color: C.white });
  // Brand fill
  page.drawCircle({ x, y, size: r, color: C.callout });
  const txt = String(n);
  const txtW = fontBold.widthOfTextAtSize(txt, 11);
  page.drawText(txt, {
    x: x - txtW / 2, y: y - 4, size: 11, font: fontBold, color: C.white,
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
