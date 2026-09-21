import { NextRequest, NextResponse } from 'next/server';
import { pool, initSchema } from '@/lib/db';
import { TEAMMATES } from '@/lib/teammates';
import {
  SESSION_COOKIE, SESSION_MAX_AGE, authEnabled, signSession, verifySession,
  normaliseName, isValidPin,
} from '@/lib/auth';
import {
  adminName, getPerson, listPeople, createPerson, claimPin, checkPin, resetPin, changePin,
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
  const people = await listPeople();
  return NextResponse.json({
    enabled: authEnabled(),
    me,
    isAdmin: me !== null && me === adminName(),
    people: people.map((p) => ({ name: p.name, needsPin: p.pin_hash === null })),
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

  // Admin clearing someone's PIN so they can set a new one
  if (action === 'reset') {
    const me = await currentUser(req);
    if (!me || me !== adminName()) return bad('Only the admin can reset a PIN.', 403);
    const target = normaliseName(body.name);
    if (!target) return bad('Which paddler?');
    if (target === adminName()) return bad('Change your own PIN instead of resetting it.');
    return (await resetPin(target)) ? NextResponse.json({ ok: true }) : bad('No such paddler.', 404);
  }

  // Someone changing their own PIN
  if (action === 'change') {
    const me = await currentUser(req);
    if (!me) return bad('Sign in first.', 401);
    if (!isValidPin(body.pin) || !isValidPin(body.newPin)) return bad('PINs are 4 to 8 digits.');
    return (await changePin(me, body.pin, body.newPin))
      ? NextResponse.json({ ok: true })
      : bad('That current PIN is not right.', 403);
  }

  const name = normaliseName(body.name);
  if (!name) return bad('Enter a name.');
  if (!isValidPin(body.pin)) return bad('Your PIN should be 4 to 8 digits.');

  // Adding yourself to the roster
  if (action === 'join') {
    if (await getPerson(name)) return bad('That name is taken — sign in instead.', 409);
    if (!(await createPerson(name, body.pin))) return bad('Could not add that name.');
    return withSession(name, secret, { joined: true });
  }

  const person = await getPerson(name);
  if (!person) return bad('No paddler by that name yet.', 404);

  // First sign-in, or the first after a reset: whatever they type becomes the PIN
  if (person.pin_hash === null) {
    if (!(await claimPin(person.name, body.pin))) return bad('That PIN is already set.', 409);
    return withSession(person.name, secret, { pinSet: true });
  }

  if (!(await checkPin(person.name, body.pin))) return bad('That PIN is not right.', 403);
  return withSession(person.name, secret, {});
}
