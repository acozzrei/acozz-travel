import { prisma } from "@/lib/prisma";

const DEFAULTS = {
  id: 1,
  googleMapsApiKey: null,
  gmailClientId: null,
  gmailClientSecret: null,
  gmailRefreshToken: null,
  gmailConnectedEmail: null,
  anthropicApiKey: null,
  masterPassword: null,
  viewPassword: null,
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

/** Redacts secrets before sending settings to the browser. The master and
 * view passwords are the exceptions sent back in full (not just a boolean)
 * — unlike the API keys above, their whole purpose is to be handed out to
 * whoever should get that level of access, so the Settings page (which is
 * itself already password-protected) needs to be able to display them. */
export function publicSettings(settings) {
  return {
    googleMapsApiKeySet: Boolean(settings.googleMapsApiKey),
    gmailClientIdSet: Boolean(settings.gmailClientId),
    gmailClientSecretSet: Boolean(settings.gmailClientSecret),
    gmailConnected: Boolean(settings.gmailRefreshToken),
    gmailConnectedEmail: settings.gmailConnectedEmail || null,
    anthropicApiKeySet: Boolean(settings.anthropicApiKey),
    masterPassword: settings.masterPassword || null,
    viewPassword: settings.viewPassword || null,
    authEnabled: Boolean(settings.masterPassword),
  };
}
