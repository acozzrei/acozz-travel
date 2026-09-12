import { prisma } from "@/lib/prisma";

const DEFAULTS = {
  id: 1,
  googleMapsApiKey: null,
  gmailClientId: null,
  gmailClientSecret: null,
  gmailRefreshToken: null,
  gmailConnectedEmail: null,
  gmailImapEmail: null,
  gmailImapPasswordEnc: null,
  anthropicApiKey: null,
  duffelApiKey: null,
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

/** Redacts secrets before sending settings to the browser — the master and
 * view passwords included, as booleans only. They're only ever set or
 * changed through /api/settings/change-password, which never echoes the
 * new value back either. */
export function publicSettings(settings) {
  return {
    googleMapsApiKeySet: Boolean(settings.googleMapsApiKey),
    gmailClientIdSet: Boolean(settings.gmailClientId),
    gmailClientSecretSet: Boolean(settings.gmailClientSecret),
    // Connected if either the IMAP login or the legacy OAuth flow is set up.
    gmailImapConnected: Boolean(settings.gmailImapEmail && settings.gmailImapPasswordEnc),
    gmailImapEmail: settings.gmailImapEmail || null,
    gmailConnected: Boolean(
      settings.gmailRefreshToken || (settings.gmailImapEmail && settings.gmailImapPasswordEnc)
    ),
    gmailConnectedEmail: settings.gmailImapEmail || settings.gmailConnectedEmail || null,
    anthropicApiKeySet: Boolean(settings.anthropicApiKey),
    duffelApiKeySet: Boolean(settings.duffelApiKey),
    masterPasswordSet: Boolean(settings.masterPassword),
    viewPasswordSet: Boolean(settings.viewPassword),
    authEnabled: Boolean(settings.masterPassword),
  };
}
