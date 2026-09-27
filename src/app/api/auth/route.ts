import { NextRequest, NextResponse } from 'next/server';
import { pool, initSchema } from '@/lib/db';
import { TEAMMATES } from '@/lib/teammates';
import {
  SESSION_COOKIE, SESSION_MAX_AGE, authEnabled, signSession, verifySession,
  normaliseName,
} from '@/lib/auth';
import {
  adminName, getPerson, listPeople, createPerson, usesHrMonitor,
} from '@/lib/people';

export const dynamic = 'force-dynamic';

const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

/** Seed the roster from the hard-coded teammate list the first time it is needed. */
async function ensureRoster() {
  await initSchema();
  for (const t of TEAMMATES) {
    await pool.query('INSERT INTO people (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [t]);
  }
}

async function currentUser(req: NextRequest): Promise<string | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  return verifySession(req.cookies.get(SESSION_COOKIE)?.value, secret);
}

function withSession(name: string, secret: string, body: Record<string, unknown>) {
  return signSession(name, secret).then((value) => {
    const res = NextResponse.json({ ok: true, name, ...body });
    res.cookies.set(SESSION_COOKIE, value, {
      httpOnly: true,           // keeps Safari from expiring it after 7 idle days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  });
}

/** Who is signed in, and who can sign in. */
export async function GET(req: NextRequest) {
  await ensureRoster();
  const me = await currentUser(req);
  // The roster is for the crew. Someone signed out types their name instead of
  // picking it, so the sign-in page doesn't hand the list to any visitor.
  const people = me || !authEnabled() ? await listPeople() : [];
  return NextResponse.json({
    enabled: authEnabled(),
    me,
    isAdmin: me !== null && me === adminName(),
    usesHrMonitor: me ? await usesHrMonitor(me) : false,
    people: people.map((p) => ({ name: p.name })),
  });
}

export async function POST(req: NextRequest) {
  await ensureRoster();
  const secret = process.env.AUTH_SECRET;
  if (!secret) return bad('Sign-in is not configured yet.', 501);

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  if (action === 'logout') {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  }

  // Your own settings — for now just whether you wear a heart rate strap
  if (action === 'settings') {
    const me = await currentUser(req);
    if (!me) return bad('Sign in first.', 401);
    await pool.query('UPDATE people SET uses_hr_monitor = $1 WHERE name = $2', [body.usesHrMonitor === true, me]);
    return NextResponse.json({ ok: true });
  }

  // The team code is the only gate. Once someone has it they are crew, and a
  // PIN on top was one more thing to forget — sessions last a year per device,
  // so the code is rarely asked for twice.
  const teamCode = process.env.TEAM_CODE?.trim().toLowerCase();
  if (!teamCode) return bad(`Sign-in is closed right now — ask ${adminName()}.`, 403);
  if (String(body.teamCode ?? '').trim().toLowerCase() !== teamCode) return bad('That team code is not right.', 403);

  const name = normaliseName(body.name);
  if (!name) return bad('Enter your name.');

  // Adding yourself to the roster
  if (action === 'join') {
    // Race results are matched on first and last name together
    const lastName = normaliseName(body.lastName);
    if (!lastName) return bad('Add your last name so ARTIE can find you in race results.');
    if (await getPerson(name)) return bad('That name is taken — sign in instead.', 409);
    if (!(await createPerson(name, lastName))) return bad('Could not add that name.');
    return withSession(name, secret, { joined: true });
  }

  const person = await getPerson(name);
  if (!person) return bad('No paddler by that name — new here? Tap Join.', 404);
  return withSession(person.name, secret, {});
}
