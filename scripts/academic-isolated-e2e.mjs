import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes, randomInt } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const api = process.env.E2E_API_BASE;
const frontend = process.env.E2E_FRONT_BASE;
const runId = process.env.E2E_RUN_ID;
assert.equal(process.env.E2E_ISOLATED, '1');
assert.equal(api, 'http://127.0.0.1:18080/api/v1');
assert.equal(frontend, 'http://127.0.0.1:4200');
assert.match(runId ?? '', /^[a-f0-9]{10}$/);
const postgres = 'shuji-e2e-' + runId + '-postgres-1';
assert.equal(execFileSync('docker', ['inspect', '--format', '{{ index .Config.Labels "com.docker.compose.project" }}', postgres], { encoding: 'utf8' }).trim(), 'shuji-e2e-' + runId);
const artifacts = process.env.E2E_ARTIFACT_DIR;
assert.ok(artifacts);
await mkdir(artifacts, { recursive: true });
const results = [];
let stage = 'preparación';
let browser;
let currentPage;
const passwords = new Map();

function sql(text) {
  return execFileSync('docker', ['exec', '-i', postgres, 'psql', '-At', '-v', 'ON_ERROR_STOP=1', '-U', 'e2e', '-d', 'shuji_e2e'], { input: text, encoding: 'utf8' }).trim();
}
function id(value) {
  assert.ok(Number.isSafeInteger(value) && value > 0, 'Identificador inválido del fixture');
  return value;
}
function pass(label) {
  results.push({ prueba: label, estado: 'APROBADA', fechaHora: new Date().toISOString() });
  console.log('PASS ' + label);
}
async function request(method, path, token, body) {
  const form = body instanceof FormData;
  const response = await fetch(api + path, {
    method,
    headers: { ...(token ? { authorization: 'Bearer ' + token } : {}), ...(!form && body ? { 'content-type': 'application/json' } : {}) },
    body: body ? form ? body : JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000)
  });
  const raw = await response.json().catch(() => null);
  assert.ok(response.ok, method + ' ' + path + ' HTTP ' + response.status + ' ' + (raw?.errorCode ?? raw?.message ?? ''));
  return raw?.data ?? raw;
}
async function login(username, password) {
  password = passwords.get(username) ?? password;
  const data = await request('POST', '/auth/login', null, { username, password });
  assert.ok(data.accessToken);
  if (data.debeCambiarPassword) {
    const nuevoPassword = randomBytes(24).toString('base64url') + 'Aa1!';
    await request('POST', '/auth/cambiar-password-inicial', data.accessToken, { nuevoPassword });
    passwords.set(username, nuevoPassword);
    return login(username, nuevoPassword);
  }
  return data.accessToken;
}
async function setInput(page, selector, value) {
  await page.$eval(selector, (input, text) => {
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set;
    setter.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.blur();
  }, value);
}
async function selectId(page, selector, value) {
  await page.waitForFunction((selector, id) => Array.from(document.querySelector(selector)?.options ?? []).some(option => option.value === String(id) || option.value.endsWith(': ' + id)), { timeout: 15000 }, selector, value);
  await page.$eval(selector, (select, id) => {
    select.value = Array.from(select.options).find(option => option.value === String(id) || option.value.endsWith(': ' + id)).value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function clickText(page, selector, text) {
  const found = await page.$$eval(selector, (elements, text) => {
    const element = elements.find(item => item.textContent.trim().includes(text));
    if (!element) return false;
    element.click();
    return true;
  }, text);
  assert.ok(found, 'No se encontró la acción ' + text);
}
async function responseAfter(page, path, method, action) {
  const pending = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1' + path && response.request().method() === method, { timeout: 20000 });
  await action();
  const response = await pending;
  assert.ok(response.ok(), method + ' UI ' + path + ' HTTP ' + response.status());
  const raw = await response.json().catch(() => null);
  return raw?.data ?? raw;
}
async function pageFor(username, password) {
  password = passwords.get(username) ?? password;
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  currentPage = page;
  page.setDefaultNavigationTimeout(60000);
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(frontend + '/auth/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#username');
  await page.type('#username', username);
  await page.type('#password', password);
  await responseAfter(page, '/auth/login', 'POST', () => page.click('button[type=submit]'));
  await page.waitForFunction(() => location.pathname === '/admin/dashboard');
  return page;
}
const peDate = iso => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
const day = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(p => [p.type, p.value]));
const today = day.year + '-' + day.month + '-' + day.day;
const history = new Date(today + 'T12:00:00Z');
history.setUTCDate(history.getUTCDate() - 1);
while ([0, 6].includes(history.getUTCDay())) history.setUTCDate(history.getUTCDate() - 1);
const historicalDay = history.toISOString().slice(0, 10);
const academicYear = Number(day.year);
const quarter = Math.floor((Number(day.month) - 1) / 3) + 1;
const periodStart = day.year + '-' + String((quarter - 1) * 3 + 1).padStart(2, '0') + '-01';

try {
  const directionToken = await login(process.env.E2E_USERNAME, process.env.E2E_PASSWORD);
  const password = randomBytes(24).toString('base64url') + 'Aa1!';
  const teacherName = 'e2e_doc_' + runId;
  const auxiliaryName = 'e2e_aux_' + runId;
  const teacher = await request('POST', '/usuarios', directionToken, { username: teacherName, email: teacherName + '@local.test', password, roles: ['DOCENTE'], dni: String(randomInt(80000000, 89999999)), nombreCompleto: 'Camila Rojas Pruebas' });
  await request('POST', '/usuarios', directionToken, { username: auxiliaryName, email: auxiliaryName + '@local.test', password, roles: ['AUXILIAR'], dni: String(randomInt(80000000, 89999999)), nombreCompleto: 'Marina Torres Pruebas' });
  const teacherToken = await login(teacherName, password);
  const auxiliaryToken = await login(auxiliaryName, password);
  const years = await request('GET', '/academico/anios', directionToken);
  const year = years.find(year => year.anio === academicYear) ?? await request('POST', '/academico/anios', directionToken, { anio: academicYear, fechaInicio: day.year + '-01-01', fechaFin: day.year + '-12-31' });
  const period = await request('POST', '/academico/periodos', directionToken, { anioLectivoId: year.id, numeroPeriodo: quarter, nombre: 'Periodo E2E', fechaInicio: periodStart, fechaFin: day.year + '-12-31' });
  const levels = await request('GET', '/academico/niveles', directionToken);
  const primary = levels.find(level => level.codigo === 'PRIMARIA');
  const existingGrades = await request('GET', '/academico/grados?nivelId=' + primary.id, directionToken);
  const grade = existingGrades.find(grade => grade.numeroGrado === 1) ?? await request('POST', '/academico/grados', directionToken, { nivelId: primary.id, numeroGrado: 1, nombre: 'Primero primaria E2E' });
  const classroom = await request('POST', '/academico/aulas', directionToken, { codigo: 'E2E-' + runId, nombre: 'Aula de prueba', ubicacion: 'Edificio de prueba', capacidad: 30 });
  const section = await request('POST', '/academico/secciones', directionToken, { anioLectivoId: year.id, gradoId: grade.id, nivelId: primary.id, letra: 'A', cupoMaximo: 30, aulaFisica: classroom.codigo });
  const area = await request('POST', '/curriculo/areas', directionToken, { nivelId: primary.id, codigo: 'MAT-' + runId.slice(0, 5), nombre: 'Matemática de prueba' });
  const competency = await request('POST', '/curriculo/competencias', directionToken, { areaId: area.id, numeroOrden: 1, nombre: 'Resuelve problemas de cantidad', descripcion: 'Competencia de prueba' });
  const dni = String(randomInt(80000000, 89999999));
  const student = await request('POST', '/estudiantes', directionToken, { tipoDocumento: 'DNI', numeroDocumento: dni, nombres: 'Luciana', apellidoPaterno: 'Ruiz', apellidoMaterno: 'Pruebas', fechaNacimiento: (academicYear - 7) + '-05-15', genero: 'F' });
  sql('BEGIN; INSERT INTO public.postulaciones_docentes (docente_usuario_id,nivel_id,estado) VALUES (' + id(teacher.id) + ',' + id(primary.id) + ",'APROBADA'); INSERT INTO public.docente_areas_curriculares (docente_usuario_id,nivel_id,area_curricular_id) VALUES (" + id(teacher.id) + ',' + id(primary.id) + ',' + id(area.id) + '); COMMIT;');
  const assignment = await request('POST', '/curriculo/asignaciones', directionToken, { docenteUsuarioId: teacher.id, seccionId: section.id, anioLectivoId: year.id, nivelId: primary.id, areaCurricularId: area.id });
  // Datos históricos preexistentes de prueba. Las altas nuevas siguen usando la política de admisión.
  const enrollmentId = Number(sql('INSERT INTO public.matriculas (anio_lectivo_id,estudiante_id,seccion_id,fecha_matricula,estado_matricula,observaciones) VALUES (' + id(year.id) + ',' + id(student.id) + ',' + id(section.id) + ",'" + day.year + "-01-15T12:00:00Z','MATRICULADO','Fixture histórico E2E') RETURNING id;").split('\n')[0]);
  id(enrollmentId);
  pass('Fixture histórico aislado y docente con asignación válida');

  browser = await puppeteer.launch({ executablePath: process.env.E2E_CHROME, headless: true, protocolTimeout: 15000, args: ['--disable-gpu', '--disable-extensions'] });
  const pdfPage = await browser.newPage();
  await pdfPage.setContent('<h1>Sustento ficticio E2E</h1><p>Documento para prueba funcional local.</p>');
  const pdfPath = join(artifacts, 'sustento-prueba.pdf');
  await pdfPage.pdf({ path: pdfPath, format: 'A4' });
  await pdfPage.close();
  const page = await pageFor(auxiliaryName, password);
  stage = 'asistencia desde Angular';
  await page.goto(frontend + '/admin/asistencia', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.innerText.includes('Registrar asistencia'));
  await clickText(page, 'button', 'Registrar asistencia');
  const attendanceDialog = 'dialog[open]:has(#registro-dialog-title)';
  await page.waitForSelector(attendanceDialog);
  await setInput(page, '#asistencia-matricula-id', String(enrollmentId));
  await setInput(page, '#asistencia-fecha-nueva input', peDate(historicalDay));
  await setInput(page, '#asistencia-hora-registro', '08:00');
  await page.select('#asistencia-estado-registro', 'FALTA_INJUSTIFICADA');
  const attendance = await responseAfter(page, '/asistencia/aula', 'POST', () => page.click(attendanceDialog + ' button[type=submit]'));
  assert.ok(attendance.id);
  assert.equal(sql('SELECT estado FROM public.asistencias_aula WHERE id=' + id(attendance.id) + ';'), 'FALTA_INJUSTIFICADA');
  pass('Asistencia Angular → API → PostgreSQL');

  stage = 'justificación con PDF';
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#fecha-registro-asistencia input');
  const daily = await responseAfter(page, '/asistencia/aula', 'GET', () => setInput(page, '#fecha-registro-asistencia input', peDate(historicalDay)));
  assert.ok(daily.asistencias.some(row => row.id === attendance.id && row.seccionId === section.id && row.seccion.includes('Sección A')));
  await page.waitForFunction(() => document.querySelector('tbody')?.innerText.includes('Luciana'));
  await clickText(page, 'tbody button', 'Justificar');
  await page.waitForSelector('#motivo-justificacion');
  await page.type('#motivo-justificacion', 'Cita médica de prueba con sustento ficticio.');
  await (await page.$('#sustento-pdf-input')).uploadFile(pdfPath);
  await responseAfter(page, '/asistencia/aula/justificacion', 'POST', () => page.click('dialog[open]:has(#justificacion-dialog-title) button[type=submit]'));
  assert.equal(sql('SELECT estado FROM public.asistencias_aula WHERE id=' + id(attendance.id) + ';'), 'FALTA_JUSTIFICADA');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#fecha-registro-asistencia input');
  await responseAfter(page, '/asistencia/aula', 'GET', () => setInput(page, '#fecha-registro-asistencia input', peDate(historicalDay)));
  await page.waitForFunction(() => document.querySelector('tbody')?.innerText.includes('FALTA_JUSTIFICADA'));
  pass('PDF de justificación y estado persistente tras recarga');

  await page.click('#fecha-registro-asistencia button[aria-label="Abrir calendario"]');
  await page.waitForSelector('#fecha-registro-asistencia dialog[open]');
  assert.ok(await page.$$eval('#fecha-registro-asistencia .calendar-grid__day', days => {
    const weekends = days.filter(day => /sábado|domingo/i.test(day.getAttribute('aria-label') ?? ''));
    return weekends.length > 0 && weekends.every(day => day.disabled);
  }), 'El calendario permite seleccionar fines de semana');
  await page.keyboard.press('Escape');
  pass('Calendario de asistencia con ingreso manual y fines de semana bloqueados');

  stage = 'CSV biométrico multifecha';
  const csvDays = [];
  const cursor = new Date(historicalDay + 'T12:00:00Z');
  while (csvDays.length < 5) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (![0, 6].includes(cursor.getUTCDay())) csvDays.push(cursor.toISOString().slice(0, 10));
  }
  const csvPath = join(artifacts, 'marcas-cinco-fechas.csv');
  await writeFile(csvPath, 'dni,fechaHora,dispositivoCodigo\r\n' + csvDays.map((date, i) => dni + ',' + date + 'T' + (i % 2 ? '08:30:00' : '07:00:00') + '-05:00,PUERTA-E2E').join('\r\n'));
  await clickText(page, 'button', 'Importar marca');
  await (await page.waitForSelector('#archivo-csv-biometrico')).uploadFile(csvPath);
  await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Confirmar e importar CSV') && !b.disabled));
  const job = await responseAfter(page, '/asistencia/biometrico/importar-csv', 'POST', () => clickText(page, 'button', 'Confirmar e importar CSV'));
  assert.match(job.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Identificador UUID inválido de la importación');
  let finished;
  for (let i = 0; i < 80; i++) {
    finished = await request('GET', '/asistencia/biometrico/importaciones/' + encodeURIComponent(job.id), auxiliaryToken);
    if (finished.estado === 'COMPLETADO') break;
    assert.notEqual(finished.estado, 'ERROR', 'Falló el procesamiento biométrico');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.equal(finished.estado, 'COMPLETADO');
  assert.equal(Number(finished.marcasValidas), 5);
  const marks = sql('SELECT count(DISTINCT (fecha_hora AT TIME ZONE \'America/Lima\')::date) FROM public.marcas_biometrico_porteria WHERE dni_leido=' + "'" + dni + "';");
  assert.equal(Number(marks), 5);
  pass('CSV de cinco fechas → cola Redis → cinco fechas persistidas');

  stage = 'calificaciones desde Angular';
  const teacherPage = await pageFor(teacherName, password);
  await teacherPage.goto(frontend + '/admin/calificaciones', { waitUntil: 'domcontentloaded' });
  await selectId(teacherPage, '#asignacion-calificaciones', assignment.id);
  await selectId(teacherPage, '#periodo-calificaciones', period.id);
  await selectId(teacherPage, '#competencia-calificaciones', competency.id);
  await teacherPage.waitForFunction(() => document.querySelector('tbody')?.innerText.includes('Luciana'));
  await clickText(teacherPage, 'tbody button', 'Editar');
  await teacherPage.waitForSelector('#calif-nota-cneb-select');
  await teacherPage.select('#calif-nota-cneb-select', 'C');
  await teacherPage.type('#calif-conclusion-textarea', 'Necesita refuerzo para resolver problemas de cantidad.');
  await teacherPage.click('dialog[open]:has(#calificacion-dialog-title) button[type=submit]');
  await responseAfter(teacherPage, '/evaluacion/cneb', 'POST', () => clickText(teacherPage, 'button', 'Guardar en BD'));
  const grades = await request('GET', '/evaluacion/cneb?asignacionDocenteId=' + assignment.id + '&periodoAcademicoId=' + period.id, teacherToken);
  assert.ok(grades.some(g => g.matriculaId === enrollmentId && g.calificacionCualitativa === 'C'));
  assert.equal(sql('SELECT calificacion_cualitativa || ' + "'|'" + ' || requiere_refuerzo::text FROM public.calificaciones_cneb WHERE matricula_id=' + enrollmentId + ' AND competencia_id=' + competency.id + ';'), 'C|true');
  await teacherPage.reload({ waitUntil: 'domcontentloaded' });
  await selectId(teacherPage, '#asignacion-calificaciones', assignment.id);
  await selectId(teacherPage, '#periodo-calificaciones', period.id);
  await selectId(teacherPage, '#competencia-calificaciones', competency.id);
  await teacherPage.waitForFunction(() => document.querySelector('tbody')?.innerText.includes('Luciana') && document.querySelector('tbody')?.innerText.includes('C'));
  pass('Nota C, bandera de refuerzo y recarga Angular/API/PostgreSQL');

  stage = 'refuerzo desde Angular';
  await teacherPage.goto(frontend + '/admin/refuerzos', { waitUntil: 'domcontentloaded' });
  await selectId(teacherPage, '#refuerzo-asignacion-select', assignment.id);
  await selectId(teacherPage, '#refuerzo-periodo-select', period.id);
  await clickText(teacherPage, 'summary', 'Programar sesión');
  await teacherPage.type('#refuerzo-tema-input', 'Refuerzo E2E ' + runId);
  await setInput(teacherPage, '#refuerzo-fecha-input input', peDate(today));
  await setInput(teacherPage, '#refuerzo-inicio-input', '10:00');
  await setInput(teacherPage, '#refuerzo-fin-input', '10:45');
  await teacherPage.waitForFunction(code => Array.from(document.querySelector('#refuerzo-aula-select')?.options ?? []).some(option => option.value === code), {}, classroom.codigo);
  await teacherPage.select('#refuerzo-aula-select', classroom.codigo);
  const session = await responseAfter(teacherPage, '/evaluacion/refuerzo', 'POST', () => teacherPage.click('form button[type=submit]'));
  await teacherPage.waitForFunction(() => document.body.innerText.includes('Pase de lista y seguimiento'));
  const inscriptions = await responseAfter(teacherPage, '/evaluacion/refuerzo/' + id(session.id) + '/derivacion', 'POST', () => clickText(teacherPage, 'button', 'Derivar estudiantes B/C'));
  const inscription = inscriptions.find(item => item.estudianteId === student.id);
  assert.ok(inscription?.id);
  await clickText(teacherPage, 'button', 'Pase de lista y seguimiento');
  await teacherPage.waitForSelector('#estado-asist-' + inscription.id);
  await teacherPage.select('#estado-asist-' + inscription.id, 'ASISTIO');
  await setInput(teacherPage, '#obs-formativa-' + inscription.id, 'Resolvió ejercicios con material concreto. Revisión próxima semana.');
  await responseAfter(teacherPage, '/evaluacion/refuerzo/asistencia', 'POST', () => teacherPage.$eval('#estado-asist-' + inscription.id, select => select.closest('tr').querySelector('button').click()));
  assert.equal(sql('SELECT estado_asistencia FROM public.inscripciones_refuerzo WHERE id=' + id(inscription.id) + ' AND calificacion_origen_id IS NOT NULL;'), 'ASISTIO');
  await teacherPage.reload({ waitUntil: 'domcontentloaded' });
  await selectId(teacherPage, '#refuerzo-asignacion-select', assignment.id);
  await selectId(teacherPage, '#refuerzo-periodo-select', period.id);
  await teacherPage.waitForFunction(() => document.body.innerText.includes('Pase de lista y seguimiento'));
  await clickText(teacherPage, 'button', 'Pase de lista y seguimiento');
  await teacherPage.waitForSelector('#estado-asist-' + inscription.id);
  assert.equal(await teacherPage.$eval('#estado-asist-' + inscription.id, input => input.value), 'ASISTIO');
  pass('Sesión de refuerzo, derivación desde nota C, asistencia y recarga');

  stage = 'SMTP de ticket y resolución';
  const adminName = 'e2e_admin_acad_' + runId;
  const adminPassword = randomBytes(24).toString('base64url');
  sql("WITH nuevo AS (INSERT INTO public.usuarios (nombre_usuario,correo_electronico,usuario_password,nombre_completo,activo) VALUES ('" + adminName + "','" + adminName + "@local.test',crypt('" + adminPassword + "',gen_salt('bf',10)),'Administrador E2E',true) RETURNING id) INSERT INTO public.usuario_roles (usuario_id,rol_id) SELECT nuevo.id,roles.id FROM nuevo JOIN public.roles ON codigo_rol='ADMINISTRADOR';");
  const adminToken = await login(adminName, adminPassword);
  const ticket = await request('POST', '/solicitudes-cambio', directionToken, { titulo: 'Prueba E2E de notificaciones', modulo: 'Calificaciones', motivoProblema: 'Verificar entrega local de las actualizaciones del ticket.', resultadoEsperado: 'Recibir el aviso de emisión y de resolución en el capturador SMTP.', idempotencyKey: 'academic-' + runId });
  for (const nuevoEstado of ['EN_EVALUACION', 'APROBADA', 'EN_EJECUCION', 'RESUELTA', 'CERRADA']) {
    await request('PATCH', '/solicitudes-cambio/' + ticket.id + '/gestion', adminToken, { nuevoEstado, comentario: 'Actualización de prueba E2E.', resumenCambio: 'Verificación académica completada.', pruebaPosterior: 'Asistencia, CNEB y refuerzo persistidos.' });
  }
  let captured = [];
  for (let i = 0; i < 40; i++) {
    const res = await fetch('http://127.0.0.1:18025/api/v1/messages', { signal: AbortSignal.timeout(5000) });
    assert.ok(res.ok);
    const data = await res.json();
    captured = (data.messages ?? []).filter(message => message.Subject?.includes(ticket.codigo));
    if (captured.length >= 4) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(captured.length >= 4, 'Faltan notificaciones capturadas para el ticket');
  assert.ok(captured.every(message => message.To?.some(recipient => recipient.Address === process.env.E2E_USERNAME + '@local.test')));
  const delivered = await fetch('http://127.0.0.1:18025/api/v1/message/' + encodeURIComponent(captured[0].ID));
  assert.ok(delivered.ok);
  const content = await delivered.json();
  assert.ok((content.HTML ?? content.Text ?? '').includes(ticket.codigo), 'El correo no identifica el ticket');
  assert.equal(sql('SELECT count(*) FROM public.solicitudes_cambio_notificaciones WHERE solicitud_id=' + id(ticket.id) + " AND estado_envio='FALLIDO';"), '0');
  assert.ok(Number(sql('SELECT count(*) FROM public.solicitudes_cambio_notificaciones WHERE solicitud_id=' + id(ticket.id) + " AND estado_envio='ENVIADO';")) >= 4);
  pass('Avisos de emisión y actualización entregados a SMTP local y registrados ENVIADO');
  await teacherPage.setViewport({ width: 390, height: 844 });
  await teacherPage.screenshot({ path: join(artifacts, 'refuerzo-movil.png'), fullPage: true });
  console.log('PASS E2E académico y SMTP local completo');
} catch (error) {
  const detail = String(error?.message ?? error).replace(/\r?\n/g, ' ').slice(0, 350);
  results.push({ prueba: stage, estado: 'FALLIDA', fechaHora: new Date().toISOString(), detalle: detail });
  console.error('FAIL ' + stage + ' | ' + detail);
  if (currentPage) await currentPage.evaluate(() => document.body.innerText).then(text => writeFile(join(artifacts, 'academic-failure.txt'), text)).catch(() => {});
  if (currentPage) await currentPage.screenshot({ path: join(artifacts, 'academic-failure.png'), fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await writeFile(join(artifacts, 'academic-results.json'), JSON.stringify(results, null, 2));
  if (browser) {
    const closing = browser.close().catch(() => {});
    const timedOut = await Promise.race([closing.then(() => false), new Promise(resolve => { const timer = setTimeout(() => resolve(true), 10000); timer.unref(); })]);
    if (timedOut) browser.process()?.kill();
  }
}
