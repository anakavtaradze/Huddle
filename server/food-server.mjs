import http from 'node:http';
import {randomBytes, timingSafeEqual} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {dirname, extname, resolve, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import QRCode from 'qrcode';
import {validateFoodItems} from '../Huddle-RN-Web-Preview/src/food.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const secret = () => randomBytes(24).toString('base64url');
const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };
const same = (a, b) => typeof a === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const name = value => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 60) fail(400, 'Huddle requires a name with 1 to 60 characters.');
  return value.trim();
};

export function makeFoodServer({file = resolve(root, '.data/food.json'), publicOrigin = 'http://localhost:8788',
  webRoot = resolve(root, 'Huddle-RN-Web-Preview/dist'), now = Date.now, rateLimit = 120} = {}) {
  const origin = new URL(publicOrigin);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('FOOD_PUBLIC_ORIGIN requires an HTTP or HTTPS origin without a path.');
  }
  publicOrigin = origin.origin;
  let rooms = file && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const rates = new Map();
  const qrCache = new Map();
  const persist = next => {
    if (file) {
      mkdirSync(dirname(file), {recursive: true, mode: 0o700});
      writeFileSync(`${file}.tmp`, JSON.stringify(next), {mode: 0o600});
      renameSync(`${file}.tmp`, file);
    }
    rooms = next;
  };
  const change = mutate => {
    const next = structuredClone(rooms);
    for (const [id, room] of Object.entries(next)) if (room.expiresAt <= now()) delete next[id];
    mutate(next);
    persist(next);
  };
  const view = async room => {
    const inviteUrl = `${publicOrigin}/#food=${room.id}`;
    if (!qrCache.has(room.id)) {
      if (qrCache.size >= 1000) qrCache.clear();
      qrCache.set(room.id, await QRCode.toDataURL(inviteUrl, {width: 240, margin: 4}));
    }
    return {id: room.id, title: room.title, revision: room.revision, items: room.items, expiresAt: room.expiresAt,
      members: room.members.map(({id, name, status}) => ({id, name, status})), inviteUrl, qr: qrCache.get(room.id),
      phoneAccessible: !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)};
  };
  const session = (room, member) => ({roomId: room.id, token: member.token, memberId: member.id, host: room.hostId === member.id});
  const send = (res, status, body) => {
    res.writeHead(status, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'});
    res.end(JSON.stringify(body));
  };
  return http.createServer(async (req, res) => {
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    // The service supports same-origin browsers and native clients without cookies.
    // Explicit origins protect local installations from cross-site mutations.
    if (req.headers.origin && req.headers.origin !== publicOrigin && req.headers.origin !== `http://${req.headers.host}`) {
      return send(res, 403, {error: 'Huddle rejected this browser origin.'});
    }
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/api/food/health' && req.method === 'GET') return send(res, 200, {ok: true});
      if (!path.startsWith('/api/food/')) {
        if (req.method !== 'GET' && req.method !== 'HEAD') fail(405, 'Huddle requires a GET request.');
        const relative = decodeURIComponent(path) === '/' ? '/index.html' : decodeURIComponent(path);
        const target = resolve(webRoot, `.${relative}`);
        if (!target.startsWith(resolve(webRoot) + sep) || !existsSync(target)) fail(404, 'Huddle could not find this page.');
        const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml'};
        res.setHeader('Content-Type', types[extname(target)] || 'application/octet-stream');
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
        return res.end(req.method === 'HEAD' ? undefined : readFileSync(target));
      }
      if (req.method !== 'GET') {
        const key = req.socket.remoteAddress;
        for (const [ip, value] of rates) if (value.until < now()) rates.delete(ip);
        const rate = rates.get(key) ?? {count: 0, until: now() + 60000};
        rates.set(key, rate);
        if (++rate.count > rateLimit) fail(429, 'Huddle received too many changes. You can retry in one minute.');
      }
      let body = {};
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        if (req.headers['content-type']?.split(';')[0] !== 'application/json') fail(415, 'Huddle requires JSON content.');
        let raw = '';
        for await (const chunk of req) {
          raw += chunk;
          if (Buffer.byteLength(raw) > 32000) fail(413, 'Huddle rejected an oversized request.');
        }
        try { body = JSON.parse(raw); } catch { fail(400, 'Huddle could not read this JSON request.'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Huddle requires a JSON object.');
      }
      if (path === '/api/food/rooms' && req.method === 'POST') {
        const member = {id: secret(), token: secret(), name: name(body.name), status: 'choosing'};
        const room = {id: secret(), title: name(body.title), hostId: member.id, revision: 0,
          items: [], members: [member], expiresAt: now() + 7 * 86400000};
        change(next => {
          if (Object.keys(next).length >= 1000) fail(503, 'Huddle has reached its active party limit.');
          next[room.id] = room;
        });
        return send(res, 201, {session: session(room, member), room: await view(room)});
      }
      const match = path.match(/^\/api\/food\/rooms\/([A-Za-z0-9_-]{32})(?:\/(join|items|status))?$/);
      const room = match && rooms[match[1]];
      if (!room || room.expiresAt <= now()) fail(404, 'Huddle could not find this party. Its invitation may have expired.');
      const action = match[2];
      if (!action && req.method === 'GET') return send(res, 200, await view(room));
      if (action === 'join' && req.method === 'POST') {
        const member = {id: secret(), token: secret(), name: name(body.name), status: 'choosing'};
        change(next => {
          if (next[room.id].members.length >= 50) fail(409, 'Huddle has reached this party’s participant limit.');
          next[room.id].members.push(member);
        });
        return send(res, 201, {session: session(room, member), room: await view(rooms[room.id])});
      }
      const token = req.headers.authorization?.replace(/^Bearer /, '');
      const member = room.members.find(m => same(token, m.token));
      if (!member) fail(401, 'Huddle requires your party session. You can rejoin through the invitation.');
      if (action === 'items' && req.method === 'PUT') {
        if (member.id !== room.hostId) fail(403, 'Only the host can change the shared food list.');
        if (body.revision !== room.revision) fail(409, 'The host changed the list on another device. You can reload the current list.');
        let items;
        try { items = validateFoodItems(body.items); } catch (error) { fail(400, error.message); }
        change(next => {
          next[room.id].items = items;
          next[room.id].revision++;
          for (const m of next[room.id].members) m.status = 'choosing';
        });
        return send(res, 200, await view(rooms[room.id]));
      }
      if (action === 'status' && req.method === 'PATCH') {
        if (!['choosing', 'ordered', 'ready', 'unavailable'].includes(body.status)) fail(400, 'Huddle requires a supported food status.');
        if (!room.items.length) fail(409, 'The host must publish the food list first.');
        if (body.revision !== room.revision) fail(409, 'The host changed the food list. You must review the current selection first.');
        change(next => { next[room.id].members.find(m => m.id === member.id).status = body.status; });
        return send(res, 200, await view(rooms[room.id]));
      }
      fail(405, 'Huddle does not support this action.');
    } catch (error) {
      send(res, error.status ?? 500, {error: error.status ? error.message : 'Huddle could not save or load the party. You can retry your request.'});
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.FOOD_PORT || 8788);
  makeFoodServer({file: process.env.FOOD_DATA_FILE, publicOrigin: process.env.FOOD_PUBLIC_ORIGIN || `http://localhost:${port}`})
    .listen(port, process.env.FOOD_HOST || '127.0.0.1', () => console.log(`Huddle serves food parties on port ${port}.`));
}
