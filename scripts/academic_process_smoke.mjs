import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import pg from 'pg';

// Only the disposable QA schema may receive these real UI writes.
const credentialFile = process.env.E2E_CREDENTIAL_FILE;
assert.ok(credentialFile, 'E2E_CREDENTIAL_FILE is required');
const config = JSON.parse(fs.readFileSync(credentialFile, 'utf8').replace(/^\uFEFF/, ''));
assert.match(config.qaSchema, /^qa_e2e_[a-f0-9]{12}$/);
const api = new URL(config.baseUrl);
assert.ok(['127.0.0.1', 'localhost'].includes(api.hostname) && api.port === '8081');
const frontend = process.env.E2E_FRONT_BASE ?? 'http://localhost:4200';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(frontend).hostname));
const info = JSON.parse(execFileSync('docker', ['inspect', 'shuji-postgres'], { encoding: 'utf8' }))[0];
assert.equal(info.Config.Image, 'postgres:16-alpine');
const env = Object.fromEntries(info.Config.Env.map(value => {
  const index = value.indexOf('=');
  return [value.slice(0, index), value.slice(index + 1)];
}));
assert.equal(env.POSTGRES_DB, 'Sistema Escolar');
const db = new pg.Client({ host: '127.0.0.1', port: 5433, database: env.POSTGRES_DB,
  user: env.POSTGRES_USER, password: env.POSTGRES_PASSWORD });
const schema = `"${config.qaSchema}"`;
const browser = await puppeteer.launch({
  executablePath: process.env.E2E_CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const jsErrors = [];
const traffic = [];
let phase = 'setup';
let activePage;

async function clickText(page, text) {
  await page.waitForFunction(text => [...document.querySelectorAll('button')]
    .some(button => button.textContent.trim() === text && !button.disabled), {}, text);
  await page.evaluate(text => [...document.querySelectorAll('button')]
    .find(button => button.textContent.trim() === text && !button.disabled).click(), text);
}

async function session(role) {
  const user = config.users.find(user => user.role === role);
  assert.ok(user, `Missing QA role ${role}`);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  activePage = page;
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => jsErrors.push(`${role}: ${error.message}`));
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.pathname.startsWith('/api/')) traffic.push({ role, method: response.request().method(),
      path: url.pathname, status: response.status() });
  });
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname.startsWith('/api/')) {
      try {
        const headers = { ...request.headers() };
        for (const name of ['host', 'content-length', 'connection', 'accept-encoding']) delete headers[name];
        const response = await fetch(new URL(url.pathname + url.search, api.origin), {
          method: request.method(), headers,
          ...(['GET', 'HEAD'].includes(request.method()) ? {} : { body: request.postData() }),
          signal: AbortSignal.timeout(15000)
        });
        const responseHeaders = Object.fromEntries(response.headers);
        for (const name of ['content-length', 'content-encoding', 'transfer-encoding']) delete responseHeaders[name];
        await request.respond({ status: response.status, headers: responseHeaders,
          body: Buffer.from(await response.arrayBuffer()) });
      } catch (error) {
        jsErrors.push(`Local QA proxy ${request.method()} ${url.pathname}: ${error.message}`);
        await request.abort();
      }
    } else if (['localhost', '127.0.0.1'].includes(url.hostname) || url.protocol === 'data:') {
      void request.continue();
    } else void request.abort();
  });
  await page.goto(`${frontend}/auth/login`, { waitUntil: 'networkidle0' });
  await page.type('#username', user.username);
  await page.type('#password', user.password);
  const login = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/auth/login'));
  await page.click('button[type=submit]');
  assert.equal((await login).status(), 200, `${role} UI login`);
  await page.waitForFunction(() => location.pathname.startsWith('/admin/'));
  return { page, context };
}

async function responseAfter(page, method, path, action) {
  const response = page.waitForResponse(response => response.request().method() === method
    && new URL(response.url()).pathname === path);
  const [result] = await Promise.all([response, action()]);
  assert.ok(result.status() >= 200 && result.status() < 300, `${method} ${path}: ${result.status()}`);
  const body = await result.text();
  return body ? JSON.parse(body) : null;
}

try {
  await db.connect();
  if (process.env.E2E_ACADEMIC_FLOW !== 'refuerzo') {
  phase = 'direction-login';
  const { page: timetable, context: direction } = await session('DIRECCION');
  phase = 'timetable-load';
  await timetable.goto(`${frontend}/admin/horarios`, { waitUntil: 'networkidle0' });
  await timetable.waitForSelector('select[name=grado] option[value*="/"]');
  const options = await timetable.$$eval('select[name=grado] option', options => options
    .filter(option => option.textContent.includes('Primaria')).map(option => option.value));
  let grade;
  for (const option of options) {
    const [yearId, gradeId] = option.split('/').map(Number);
    const existing = await db.query(`SELECT count(*)::int n FROM ${schema}.mallas_horarias_grado
      WHERE anio_lectivo_id=$1 AND grado_id=$2 AND activo`, [yearId, gradeId]);
    if (existing.rows[0].n === 0) { grade = option; break; }
  }
  assert.ok(grade, 'An empty QA grade timetable is required');
  phase = 'timetable-change-grade';
  await responseAfter(timetable, 'GET', `/api/v1/horarios/grado/${grade.split('/')[1]}`,
    () => timetable.select('select[name=grado]', grade));
  await timetable.waitForFunction(() => [...document.querySelectorAll('select[name=area] option')]
    .some(option => !option.textContent.includes('Selecciona')));
  const area = await timetable.$eval('select[name=area]', select => [...select.options]
    .find(option => !option.textContent.includes('Selecciona')).value);
  await timetable.select('select[name=area]', area);
  phase = 'timetable-create';
  const createdBody = await responseAfter(timetable, 'POST', '/api/v1/horarios/grado',
    () => clickText(timetable, '+ Programar'));
  const created = createdBody?.data ?? createdBody;
  assert.ok(created.id, 'Created timetable id');
  const stored = await db.query(`SELECT * FROM ${schema}.mallas_horarias_grado WHERE id=$1`, [created.id]);
  assert.equal(stored.rows.length, 1);
  assert.equal(stored.rows[0].activo, true);
  await timetable.waitForFunction(() => [...document.querySelectorAll('button')]
    .some(button => button.textContent.trim() === 'Mover / editar'));
  await clickText(timetable, 'Mover / editar');
  await responseAfter(timetable, 'PUT', `/api/v1/horarios/grado/${created.id}`,
    () => clickText(timetable, 'Mover aquí'));
  const moved = (await db.query(`SELECT * FROM ${schema}.mallas_horarias_grado WHERE id=$1`, [created.id])).rows[0];
  assert.ok(moved.dia_semana !== stored.rows[0].dia_semana
    || moved.bloque_horario_id !== stored.rows[0].bloque_horario_id, 'Timetable moved in DB');
  await timetable.waitForFunction(() => [...document.querySelectorAll('button')]
    .some(button => button.textContent.trim() === 'Retirar' && !button.disabled));
  await responseAfter(timetable, 'DELETE', `/api/v1/horarios/grado/${created.id}`,
    () => clickText(timetable, 'Retirar'));
  assert.equal((await db.query(`SELECT activo FROM ${schema}.mallas_horarias_grado WHERE id=$1`, [created.id])).rows[0].activo, false);
  await timetable.reload({ waitUntil: 'networkidle0' });
  await responseAfter(timetable, 'GET', `/api/v1/horarios/grado/${grade.split('/')[1]}`,
    () => timetable.select('select[name=grado]', grade));
  await timetable.waitForFunction(() => !document.body.innerText.includes('Cargando malla del grado'));
  assert.equal(await timetable.$$eval('button', buttons => buttons.filter(button => button.textContent.trim() === 'Retirar').length), 0);
  console.log('PASS horario: UI crear -> mover -> retirar; DB y recarga coherentes');
  await direction.close();

  phase = 'teacher-login';
  const { page: grades, context: teacher } = await session('DOCENTE');
  phase = 'grades-load';
  await grades.goto(`${frontend}/admin/calificaciones`, { waitUntil: 'networkidle0' });
  await grades.waitForSelector('tbody tr button');
  const rows = await grades.$$eval('tbody tr', rows => rows.filter(row => row.querySelector('button')).length);
  phase = 'grades-edit';
  assert.ok(rows > 0, 'Teacher has enrolled pupils');
  for (let index = 0; index < rows; index++) {
    await grades.$$eval('tbody tr', (rows, index) => rows.filter(row => row.querySelector('button'))[index].querySelector('button').click(), index);
    await grades.waitForSelector('dialog[open] select[name=nota]');
    await grades.select('dialog[open] select[name=nota]', index === 0 ? 'C' : 'A');
    await grades.type('dialog[open] textarea[name=conclusion]', index === 0
      ? 'Reconoce cantidades con material concreto; requiere reforzar la comparación de números.'
      : 'Resuelve las actividades y explica de forma clara el procedimiento empleado.');
    await clickText(grades, 'Aplicar cambios');
  }
  phase = 'grades-save';
  const payloadResponse = await responseAfter(grades, 'POST', '/api/v1/evaluacion/cneb',
    () => clickText(grades, 'Guardar en BD'));
  const saved = payloadResponse?.data ?? payloadResponse;
  assert.ok(Array.isArray(saved) && saved.length === rows, 'All pupils saved');
  const first = saved[0];
  const persisted = (await db.query(`SELECT * FROM ${schema}.calificaciones_cneb WHERE id=$1`, [first.id])).rows[0];
  assert.equal(persisted.calificacion_cualitativa, 'C');
  assert.equal(persisted.requiere_refuerzo, true);
  assert.ok(persisted.conclusion_descriptiva.includes('material concreto'));
  await grades.reload({ waitUntil: 'networkidle0' });
  await grades.waitForFunction(() => document.body.innerText.includes('material concreto'));
  assert.ok((await grades.$eval('tbody tr', row => row.innerText)).includes('C'));
  console.log(`PASS notas: UI editar ${rows} alumnos -> guardar lote -> persistencia C/refuerzo -> recarga`);
  await teacher.close();
  }

  phase = 'reinforcement-login';
  const { page: reinforcement, context: reinforcementContext } = await session('DOCENTE');
  await reinforcement.goto(`${frontend}/admin/refuerzos`, { waitUntil: 'networkidle0' });
  await reinforcement.waitForFunction(() => document.querySelector('select')?.options.length > 0);
  await reinforcement.click('details summary');
  await reinforcement.type('input[name=tema]', 'Comparación de cantidades');
  for (const [name, value] of [['inicio', '08:00'], ['fin', '08:45']]) {
    await reinforcement.$eval(`input[name=${name}]`, (input, value) => {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }
  const classroom = await reinforcement.$eval('select[name=aula]', select => [...select.options]
    .filter(option => option.value).at(-1)?.value);
  assert.ok(classroom, 'A QA classroom is required');
  await reinforcement.select('select[name=aula]', classroom);
  phase = 'reinforcement-create';
  const sessionBody = await responseAfter(reinforcement, 'POST', '/api/v1/evaluacion/refuerzo',
    () => clickText(reinforcement, 'Guardar sesión'));
  const remedial = sessionBody?.data ?? sessionBody;
  assert.ok(remedial.id, 'Created reinforcement id');
  const remedialRow = (await db.query(`SELECT * FROM ${schema}.sesiones_refuerzo WHERE id=$1`, [remedial.id])).rows[0];
  assert.equal(remedialRow.codigo_aula, classroom);
  await reinforcement.waitForFunction(() => [...document.querySelectorAll('button')]
    .some(button => button.textContent.trim() === 'Derivar estudiantes B/C'));
  phase = 'reinforcement-enroll';
  const enrolledBody = await responseAfter(reinforcement, 'POST', `/api/v1/evaluacion/refuerzo/${remedial.id}/derivacion`,
    () => reinforcement.evaluate(tema => {
      const row = [...document.querySelectorAll('li')].find(row => row.querySelector('h2')?.textContent.trim() === tema);
      const button = [...(row?.querySelectorAll('button') ?? [])].find(button => button.textContent.trim() === 'Derivar estudiantes B/C');
      if (!button || button.disabled) throw Error('New reinforcement session is not ready');
      button.click();
    }, remedial.tema));
  const enrolled = enrolledBody?.data ?? enrolledBody;
  assert.ok(Array.isArray(enrolled) && enrolled.length > 0, 'Calificación C produces a reinforcement enrolment');
  await reinforcement.waitForSelector('tbody select');
  await reinforcement.select('tbody select', 'ASISTIO');
  await reinforcement.type('tbody input', 'Comparó cantidades con material concreto y explicó su procedimiento.');
  phase = 'reinforcement-attendance';
  const attendanceBody = await responseAfter(reinforcement, 'POST', '/api/v1/evaluacion/refuerzo/asistencia',
    () => clickText(reinforcement, 'Guardar'));
  const attendance = attendanceBody?.data ?? attendanceBody;
  const attendanceRow = (await db.query(`SELECT * FROM ${schema}.inscripciones_refuerzo WHERE id=$1`, [attendance.id])).rows[0];
  assert.equal(attendanceRow.estado_asistencia, 'ASISTIO');
  assert.ok(attendanceRow.observaciones.includes('material concreto'));
  assert.ok(attendanceRow.calificacion_origen_id, 'Inscription references the originating grade');
  console.log('PASS refuerzo: nota C -> UI programar aula -> derivar B/C -> asistencia -> FK y estado persistidos');
  await reinforcementContext.close();
  assert.deepEqual(jsErrors, [], 'No browser JavaScript errors');
  assert.deepEqual(traffic.filter(item => item.status >= 400), [], 'No failing API calls');
  console.log(JSON.stringify({ schema: config.qaSchema, requests: traffic.length, failedApi: 0, pageErrors: 0 }));
} catch (error) {
  console.error(JSON.stringify({ phase, page: activePage ? new URL(activePage.url()).pathname : '',
    traffic: traffic.slice(-10), jsErrors }));
  if (activePage && !activePage.isClosed()) console.error(await activePage.evaluate(() => ({
    heading: document.querySelector('main h1, main h2')?.textContent,
    selects: [...document.querySelectorAll('select')].map(select => ({name: select.name,
      id: select.id, selected: select.selectedOptions[0]?.textContent, options: select.options.length})),
    buttons: [...document.querySelectorAll('main button')].slice(0,10).map(button => ({text:button.textContent.trim(),disabled:button.disabled}))
  })));
  throw error;
} finally {
  await browser.close();
  await db.end();
}
