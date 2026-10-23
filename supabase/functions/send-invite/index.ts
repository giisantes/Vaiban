// Vaiban – send-invite Edge Function (D67)
//
// Emails someone a personal, one-time link to join a board.
// Runs on Supabase's servers, so the Resend key never reaches the website.
//
// Secrets to set in Supabase → Edge Functions → Secrets:
//   RESEND_API_KEY  a Resend API key with "Sending access"
//   SITE_URL        where Vaiban lives, e.g. https://guisantes.me
//   INVITE_FROM     the sender, e.g. Vaiban <invites@guisantes.me>
//                   (must be on the domain you verified in Resend)
// SUPABASE_URL and SUPABASE_ANON_KEY are provided by Supabase automatically.
//
// Security:
//   * The caller's own sign-in token is passed to the database, so the
//     database decides whether they own the board (prepare_invite_email in
//     migration 004) and applies the sending limits. This function never uses
//     the service_role key.
//   * The link always points at SITE_URL – never at an address taken from the
//     request – so it can't be turned into a phishing link.
//   * Board and inviter names are escaped before going into the email.

type Env = { get(name: string): string | undefined };

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function allowedOrigin(origin: string | null, site: string) {
  if (!origin) return null;
  try {
    const o = new URL(origin);
    if (o.origin === new URL(site).origin) return o.origin;
    if (o.hostname === 'localhost' || o.hostname === '127.0.0.1') return o.origin; // npm run dev
  } catch { /* not a URL */ }
  return null;
}

export function inviteEmail(p: { boardName: string; inviterName: string; link: string; expiresAt: string }) {
  const expires = new Date(p.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const board = escapeHtml(p.boardName);
  const inviter = escapeHtml(p.inviterName || 'Someone');
  const subject = `${p.inviterName || 'Someone'} invited you to "${p.boardName}" on Vaiban`;
  const text =
    `${p.inviterName || 'Someone'} has invited you to their board "${p.boardName}" on Vaiban.\n\n` +
    `Join the board:\n${p.link}\n\n` +
    `This link is just for you: it works once, only when you sign in (or create an account) with this email address, until ${expires}.\n\n` +
    `If you weren't expecting this, you can ignore this email.`;
  // Plain, readable HTML: real text (not an image), a large link, good contrast,
  // and no text under 18px (~14pt, D59).
  const html = `<!doctype html><html lang="en"><body style="margin:0;padding:24px;background:#F8FAFC;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.5;color:#0F172A">
<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:8px;padding:28px">
<h1 style="margin:0 0 12px;font-size:24px">Join “${board}” on Vaiban</h1>
<p style="margin:0 0 20px">${inviter} has invited you to their board.</p>
<p style="margin:0 0 24px"><a href="${escapeHtml(p.link)}" style="display:inline-block;background:#23466E;color:#FFFFFF;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:6px">Join the board</a></p>
<p style="margin:0 0 12px;font-size:18px;color:#334155">This link is just for you. It works once, only when you sign in (or create an account) with this email address, until ${expires}.</p>
<p style="margin:0 0 12px;font-size:18px;color:#334155">If the button doesn't work, copy this address into your browser:<br><span style="word-break:break-all">${escapeHtml(p.link)}</span></p>
<p style="margin:0;font-size:18px;color:#334155">If you weren't expecting this, you can ignore this email.</p>
</div></body></html>`;
  return { subject, text, html };
}

/** The whole function, with its outside connections passed in so it can be tested. */
export async function handle(req: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const site = (env.get('SITE_URL') || '').replace(/\/+$/, '');
  const origin = allowedOrigin(req.headers.get('Origin'), site || 'https://invalid');
  const cors: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
  };
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Use POST.' });

  const resendKey = env.get('RESEND_API_KEY');
  const from = env.get('INVITE_FROM');
  const supabaseUrl = env.get('SUPABASE_URL');
  const apiKey = req.headers.get('apikey') || env.get('SUPABASE_ANON_KEY');
  if (!resendKey || !from || !site || !supabaseUrl || !apiKey) {
    return reply(500, { error: 'Email sending isn’t set up yet (site owner: add the Edge Function secrets).' });
  }

  const authorization = req.headers.get('Authorization') || '';
  if (!/^Bearer\s+\S+/.test(authorization)) return reply(401, { error: 'Sign in first.' });

  let boardId: unknown, email: unknown;
  try {
    ({ boardId, email } = await req.json());
  } catch {
    return reply(400, { error: 'Bad request.' });
  }
  if (typeof boardId !== 'string' || typeof email !== 'string' || email.length > 254) return reply(400, { error: 'Bad request.' });

  // Ask the database as the signed-in user: it checks ownership and the limits.
  const db = await fetchFn(`${supabaseUrl}/rest/v1/rpc/prepare_invite_email`, {
    method: 'POST',
    headers: { apikey: apiKey, Authorization: authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_board: boardId, p_email: email }),
  });
  const result = await db.json().catch(() => null);
  if (!db.ok) {
    const status = db.status === 401 ? 401 : db.status >= 500 ? 502 : 400;
    return reply(status, { error: result?.message || 'Couldn’t create the invitation.', code: result?.code });
  }
  const invite = Array.isArray(result) ? result[0] : result;
  if (!invite?.token) return reply(500, { error: 'Couldn’t create the invitation.' });

  const link = `${site}/#/join/${invite.token}`;
  const message = inviteEmail({ boardName: invite.board_name, inviterName: invite.inviter_name, link, expiresAt: invite.expires_at });
  const sent = await fetchFn('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [invite.email], subject: message.subject, html: message.html, text: message.text }),
  });
  if (!sent.ok) {
    const detail = await sent.json().catch(() => ({}));
    console.error('Resend refused the email', sent.status, detail);
    return reply(502, { error: 'The invitation was saved, but the email couldn’t be sent. Copy the link and send it yourself.', invite: { id: invite.invite_id, token: invite.token, email: invite.email, expires_at: invite.expires_at } });
  }
  return reply(200, { sent: true, invite: { id: invite.invite_id, email: invite.email, expires_at: invite.expires_at } });
}

// On Supabase (Deno) this starts the function; under other runtimes (tests) it does nothing.
const runtime = (globalThis as any).Deno;
if (runtime?.serve) runtime.serve((req: Request) => handle(req, runtime.env));
