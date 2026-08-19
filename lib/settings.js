import { prisma } from "@/lib/prisma";

const DEFAULTS = {
  id: 1,
  googleMapsApiKey: null,
  gmailClientId: null,
  gmailClientSecret: null,
  gmailRefreshToken: null,
  gmailConnectedEmail: null,
  anthropicApiKey: null,
};

export async function getSettings() {
  const row = await prisma.settings.findUnique({ where: { id: 1 } });
  return row ?? DEFAULTS;
}

export async function updateSettings(data) {
  return prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
}

/** Redacts secrets before sending settings to the browser. */
export function publicSettings(settings) {
  return {
    googleMapsApiKeySet: Boolean(settings.googleMapsApiKey),
    gmailClientIdSet: Boolean(settings.gmailClientId),
    gmailClientSecretSet: Boolean(settings.gmailClientSecret),
    gmailConnected: Boolean(settings.gmailRefreshToken),
    gmailConnectedEmail: settings.gmailConnectedEmail || null,
    anthropicApiKeySet: Boolean(settings.anthropicApiKey),
  };
}
