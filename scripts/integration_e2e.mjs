import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

// Run only against disposable local services. Seed E2E_USERNAME with DIRECCION.
const frontend = process.env.E2E_FRONT_BASE;
const backend = process.env.E2E_API_BASE;
const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;
for (const [name, value] of Object.entries({ E2E_FRONT_BASE: frontend, E2E_API_BASE: backend, E2E_USERNAME: username, E2E_PASSWORD: password })) {
  assert.ok(value, `${name} is required`);
}
for (const url of [frontend, backend]) {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname), 'E2E targets must be local');
}
assert.equal(process.env.E2E_ISOLATED, '1', 'Use npm run test:e2e:isolated to protect shared databases');
assert.equal(new URL(backend).port, '18080', 'Write tests require the isolated API on port 18080');

const chrome = process.env.E2E_CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const headed = process.env.E2E_HEADED === '1';
const artifactDir = process.env.E2E_ARTIFACT_DIR ?? 'e2e-artifacts';
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: !headed,
  ...(headed ? { slowMo: 80 } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
page.setDefaultTimeout(30000);
const browserApiFailures = [];
const pageErrors = [];
const paymentApiTraffic = [];
let currentMatriculaId = null;
page.on('pageerror', error => pageErrors.push(error.message));
page.on('response', response => {
  if (response.url().includes('/tesoreria/pagos/caja')) {
    const record = {
      type: 'response',
      status: response.status(),
      method: response.request().method(),
      url: response.url(),
      body: '(leyendo respuesta)'
    };
    paymentApiTraffic.push(record);
    void response.text()
      .then(body => { record.body = body.slice(0, 1200); })
      .catch(error => { record.body = `No se pudo leer el cuerpo: ${error.message}`; });
  }
  if (response.url().startsWith(backend) && response.status() >= 400) {
    browserApiFailures.push(`${response.status()} ${response.request().method()} ${response.url()}`);
  }
});
page.on('dialog', dialog => dialog.accept());
await page.setRequestInterception(true);
page.on('request', request => {
  const url = request.url();
  if (url.includes('/tesoreria/pagos/caja')) {
    paymentApiTraffic.push({
      type: 'request',
      method: request.method(),
      url,
      body: request.postData()?.slice(0, 1200) ?? null
    });
  }
  if (url.startsWith('http://localhost:8080/api/v1')) {
    request.continue({ url: backend + url.slice('http://localhost:8080/api/v1'.length) });
  } else {
    request.continue();
  }
});

let token;
async function api(method, path, body) {
  const response = await fetch(`${backend}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const raw = await response.text();
  assert.ok(response.ok, `${method} ${path}: ${response.status} ${raw}`);
  return raw ? JSON.parse(raw) : null;
}
async function waitForText(text) {
  await page.waitForFunction(text => document.body.innerText.includes(text), {}, text);
}
async function waitForDialogClose() {
  await page.waitForFunction(() => !document.querySelector('mat-dialog-container'));
  await new Promise(r => setTimeout(r, 400));
}
async function setInput(selector, value) {
  await page.$eval(selector, (input, value) => {
    input.focus();
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.blur();
  }, value);
}

try {
  await page.goto(`${frontend}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#username');
  await page.type('#username', username);
  await page.type('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname === '/admin/dashboard');
  await waitForText('Resumen institucional');
  token = await page.evaluate(() => localStorage.getItem('accessToken'));
  assert.ok(token, 'The login did not persist the access token');
  console.log('OK login -> dashboard');

  const levels = await api('GET', '/academico/niveles');
  const primary = levels.find(level => level.codigo === 'PRIMARIA');
  assert.ok(primary, 'Missing PRIMARIA catalog entry');
  const runSuffix = Date.now();
  const academicYears = await api('GET', '/academico/anios');
  const currentYear = Math.max(2027, new Date().getFullYear());
  let year = academicYears.find(item => item.anio === currentYear && item.abierto);
  year ??= await api('POST', '/academico/anios', {
    anio: currentYear,
    fechaInicio: `${currentYear}-03-01`,
    fechaFin: `${currentYear}-12-31`
  });
  const todayPeru = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima' }).format(new Date());
  const rawStartDate = String(year.fechaInicio ?? '').slice(0, 10);
  assert.match(rawStartDate, /^\d{4}-\d{2}-\d{2}$/, `El año lectivo ${year.anio ?? year.id} no tiene fecha de inicio válida`);
  const firstDueDate = rawStartDate >= todayPeru ? rawStartDate : todayPeru;

  const grades = await api('GET', `/academico/grados?nivelId=${primary.id}`);
  let grade = grades.find(item => item.numeroGrado === 1) ?? grades[0];
  grade ??= await api('POST', '/academico/grados', {
    nivelId: primary.id,
    numeroGrado: 1,
    nombre: `Grado 1 E2E ${runSuffix}`
  });

  const sections = await api('GET', `/academico/secciones?anioId=${year.id}`);
  const gradeSections = sections.filter(item => item.gradoId === grade.id);
  const hasVacancy = item => item.cupoMaximo == null || item.vacantesOcupadas == null || item.vacantesOcupadas < item.cupoMaximo;
  let section = gradeSections.find(item => item.letra === 'A' && hasVacancy(item)) ?? gradeSections.find(hasVacancy);
  if (!section) {
    const existingLetters = new Set(gradeSections.map(item => item.letra));
    const sectionLetter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find(letter => !existingLetters.has(letter));
    assert.ok(sectionLetter, `No hay una letra disponible para crear una sección de ${grade.nombre}`);
    section = await api('POST', '/academico/secciones', {
      anioLectivoId: year.id,
      gradoId: grade.id,
      nivelId: primary.id,
      letra: sectionLetter,
      cupoMaximo: 30,
      aulaFisica: `Aula E2E ${runSuffix}`
    });
  }
  const sectionLabel = `${grade.nombre} - Sección ${section.letra}`;
  console.log('OK academic catalog -> year/grade/section');

  await page.goto(`${frontend}/admin/matriculas`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#btn-abrir-registro-alumno, #btn-abrir-matricula-presencial');
  await page.click('#tab-matriculas');
  await page.waitForFunction((id, label) => [...document.querySelectorAll('select option')].some(option => option.value === String(id) || option.textContent.includes(label)), {}, section.id, sectionLabel);
  await page.click('#tab-estudiantes');
  await page.click('#btn-abrir-registro-alumno');
  await page.waitForSelector('#nuevo-alumno-numero-doc');
  const dni = String(70000000 + Math.floor(Math.random() * 20000000));
  await page.type('#nuevo-alumno-numero-doc', dni);
  await page.type('#nuevo-alumno-nombres', 'Integracion');
  await page.type('#nuevo-alumno-ape-paterno', 'Prueba');
  await page.type('#nuevo-alumno-ape-materno', 'Local');
  await page.click('#btn-guardar-alumno');
  await waitForText('registrado exitosamente');
  await page.waitForFunction(dni => document.querySelector('#tabla-estudiantes')?.innerText.includes(dni), {}, dni);
  await waitForDialogClose();
  const students = await api('GET', '/estudiantes');
  const student = students.find(item => item.numeroDocumento === dni);
  assert.ok(student, 'The student was not persisted');
  const secondDni = String(70000000 + Math.floor(Math.random() * 20000000));
  await page.click('#btn-abrir-registro-alumno');
  await page.waitForSelector('#nuevo-alumno-numero-doc');
  await page.type('#nuevo-alumno-numero-doc', secondDni);
  await page.type('#nuevo-alumno-nombres', 'Segunda');
  await page.type('#nuevo-alumno-ape-paterno', 'Prueba');
  await page.type('#nuevo-alumno-ape-materno', 'Local');
  await page.click('#btn-guardar-alumno');
  await page.waitForFunction(dni => document.querySelector('#tabla-estudiantes')?.innerText.includes(dni), {}, secondDni);
  assert.ok((await api('GET', '/estudiantes')).find(item => item.numeroDocumento === secondDni), 'The second student without SIAGIE was not persisted');
  console.log('OK two student forms without SIAGIE -> API -> PostgreSQL');

  await waitForDialogClose();
  const matricularAction = await page.evaluate(dni => {
    const row = [...document.querySelectorAll('#tabla-estudiantes tbody tr')].find(item => item.innerText.includes(dni));
    if (!row) return { rowFound: false, buttonFound: false };
    const button = [...row.querySelectorAll('button')].find(item => item.innerText.trim() === 'Matricular');
    if (!button) return { rowFound: true, buttonFound: false };
    button.click();
    return { rowFound: true, buttonFound: true };
  }, dni);
  assert.ok(matricularAction.rowFound, `No se encontró la fila del estudiante con DNI ${dni} en #tabla-estudiantes`);
  assert.ok(matricularAction.buttonFound, `No se encontró el botón "Matricular" en la fila del DNI ${dni}`);
  await waitForText('Asignar Solicitud de Matrícula');
  await page.waitForFunction((id, label) => [...document.querySelectorAll('select[name="seccion"] option')].some(option => option.value === String(id) || option.textContent.includes(label)), {}, section.id, sectionLabel);
  const selectedSection = await page.evaluate((id, label) => {
    const select = document.querySelector('select[name="seccion"]');
    if (!select) return false;
    const option = [...select.options].find(item => item.value === String(id))
      ?? [...select.options].find(item => item.textContent.includes(label));
    if (!option) return false;
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, section.id, sectionLabel);
  assert.ok(selectedSection, `No se encontró la opción de sección ${sectionLabel} (ID ${section.id})`);
  await page.evaluate(() => {
    const form = [...document.querySelectorAll('form')].find(item => item.innerText.includes('Asignar Matrícula'));
    form?.querySelector('button[type="submit"]')?.click();
  });
  await waitForText('solicitada exitosamente');
  await waitForDialogClose();
  const matriculas = await api('GET', `/matriculas/seccion/${section.id}`);
  const matricula = matriculas.find(item => item.estudianteId === student.id);
  assert.ok(matricula, 'The enrollment was not persisted');
  currentMatriculaId = matricula.id;
  await page.click('#tab-matriculas');
  const enrollmentYear = year.anio ?? year.id;
  await page.waitForFunction((year, id) => document.body.innerText.includes(`MAT-${year}-${String(id).padStart(3, '0')}`), {}, enrollmentYear, matricula.id);
  console.log('OK enrollment form -> API -> PostgreSQL');

  const concepts = await api('GET', '/tesoreria/conceptos');
  const guardian = await api('POST', '/apoderados', {
    tipoDocumento: 'DNI',
    numeroDocumento: String(81000000 + Math.floor(Math.random() * 9000000)),
    nombres: 'Marina', apellidoPaterno: 'Santos', apellidoMaterno: 'Pruebas',
    celular: '999111222', email: 'caja-' + process.env.E2E_RUN_ID + '@local.test',
    direccion: 'Calle de prueba 123', ubigeoInei: '150101'
  });
  await api('POST', '/estudiantes/apoderados', {
    estudianteId: student.id, apoderadoId: guardian.id, parentesco: 'MADRE',
    esResponsableEconomico: true, tieneCustodia: true, permiteRecojo: true
  });
  assert.ok(concepts.some(item => item.tipoConcepto === 'MATRICULA'), 'No hay conceptos de tipo MATRICULA en el catálogo local de Tesorería');
  await page.goto(`${frontend}/admin/tesoreria`, { waitUntil: 'domcontentloaded' });
  await waitForText('Tesorería & Pagos');
  await page.waitForFunction(() =>
    document.body.innerText.includes('Generar cuota de matrícula')
    || document.body.innerText.includes('Generar Cronograma en BD')
  );
  await page.evaluate(() => {
    const btn = document.querySelector('#btn-generar-cuota-matricula')
      ?? [...document.querySelectorAll('button')].find(button =>
        button.innerText.includes('Generar cuota de matrícula')
        || button.innerText.includes('Generar Cronograma en BD')
      );
    btn?.click();
  });
  await page.waitForSelector('input[name="matricula"]');
  await setInput('input[name="matricula"]', String(matricula.id));
  const dueDateSelector = (await page.$('input[name="primerVencimiento"]'))
    ? 'input[name="primerVencimiento"]'
    : 'app-ui-calendar[name="primerVencimiento"] input';
  await setInput(dueDateSelector, firstDueDate);
  const scheduleResponse = page.waitForResponse(response =>
    (response.url().endsWith('/tesoreria/obligaciones/matricula') || response.url().endsWith('/tesoreria/obligaciones'))
    && response.request().method() === 'POST'
  );
  await page.click('dialog[aria-labelledby="cronograma-dialog-title"] form button[type="submit"]');
  assert.ok([200, 201].includes((await scheduleResponse).status()), 'The payment obligation request failed');
  await page.waitForFunction(() => !document.querySelector('dialog[aria-labelledby="cronograma-dialog-title"]')?.open);
  let obligations = await api('GET', `/tesoreria/obligaciones?matriculaId=${matricula.id}`);
  assert.ok(obligations.length >= 1, `Debe existir al menos 1 obligación generada para la matrícula #${matricula.id}`);
  await page.waitForFunction(id => [...document.querySelectorAll('table tbody tr')]
    .filter(row => row.innerText.includes(`Matrícula #${id}`)).length >= 1,
  {}, matricula.id);
  console.log(`OK payment obligation(s) -> ${obligations.length} obligation(s) for matrícula #${matricula.id}`);

  const openedPayment = await page.evaluate(id => {
    const row = [...document.querySelectorAll('table tbody tr')].find(item =>
      item.innerText.includes(`Matrícula #${id}`)
      && [...item.querySelectorAll('button')].some(button => button.innerText.includes('Cobrar en Caja'))
    );
    const button = [...(row?.querySelectorAll('button') ?? [])].find(item => item.innerText.includes('Cobrar en Caja'));
    if (!button) return false;
    button.click();
    return true;
  }, matricula.id);
  assert.ok(openedPayment, `No hay una obligación cobrable para la matrícula #${matricula.id}`);
  await page.waitForSelector('#cobro-dialog-title');
  const paymentResponse = page.waitForResponse(response => response.url().endsWith('/tesoreria/pagos/caja') && response.request().method() === 'POST');
  const confirmedPayment = await page.evaluate(() => {
    const dialog = document.querySelector('dialog[aria-labelledby="cobro-dialog-title"]');
    const button = dialog?.querySelector('#btn-confirmar-cobro-caja')
      ?? [...(dialog?.querySelectorAll('button') ?? [])].find(item =>
        item.innerText.includes('Registrar pago verificado')
        || item.innerText.includes('Confirmar pago en efectivo')
      );
    if (!button) return false;
    button.click();
    return true;
  });
  assert.ok(confirmedPayment, 'No se encontró el botón de confirmación del cobro en caja');
  assert.equal((await paymentResponse).status(), 200, 'The cash payment request failed');
  await page.waitForFunction(id => [...document.querySelectorAll('table tbody tr')].some(row => row.innerText.includes(`Matrícula #${id}`) && row.innerText.includes('PAGADO')), {}, matricula.id);
  obligations = await api('GET', `/tesoreria/obligaciones?matriculaId=${matricula.id}`);
  assert.ok(obligations.some(item => item.estado === 'PAGADO_TOTAL' && Number(item.saldoPendiente) === 0), 'Cash payment was not applied');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[aria-label="Matrícula ID:"]');
  const refreshedObligations = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname.endsWith('/tesoreria/obligaciones')
      && response.request().method() === 'GET'
      && url.searchParams.get('matriculaId') === String(matricula.id);
  });
  await setInput('input[aria-label="Matrícula ID:"]', String(matricula.id));
  assert.equal((await refreshedObligations).status(), 200, `No se recargaron las obligaciones de la matrícula #${matricula.id}`);
  await page.waitForFunction(id => [...document.querySelectorAll('table tbody tr')].some(row => row.innerText.includes(`Matrícula #${id}`) && row.innerText.includes('PAGADO')), {}, matricula.id);
  console.log('OK cash payment -> trigger -> persisted after reload');

  assert.deepEqual(browserApiFailures, [], 'Browser API failures');
  assert.deepEqual(pageErrors, [], 'Browser exceptions');
  console.log('PASS frontend/backend integration');
} catch (error) {
  console.error('Browser API failures:', browserApiFailures);
  console.error('Browser exceptions:', pageErrors);
  console.error('Visible page:', (await page.evaluate(() => document.body.innerText)).slice(0, 1500));
  console.error('Open dialog text:', await page.$$eval('dialog[open]', dialogs => dialogs.map(dialog => dialog.innerText).join('\n---\n')).catch(() => '(sin diálogos abiertos)'));
  console.error('Cobro dialog:', await page.$eval('dialog[aria-labelledby="cobro-dialog-title"]', dialog => `open=${dialog.open}\n${dialog.innerText}`).catch(() => '(sin diálogo de cobro en el DOM)'));
  console.error('Visible table rows:', await page.$$eval('table tbody tr', rows => rows.map(row => row.innerText).join('\n---\n')).catch(() => '(sin filas visibles)'));
  console.error(`Rows for Matrícula #${currentMatriculaId ?? 'desconocida'}:`, await page.$$eval('table tbody tr', (rows, id) => rows.filter(row => id == null || row.innerText.includes(`Matrícula #${id}`)).map(row => row.innerText).join('\n---\n'), currentMatriculaId).catch(() => '(no se pudieron leer las filas)'));
  console.error('Network /tesoreria/pagos/caja:', JSON.stringify(paymentApiTraffic, null, 2));
  console.error('CDK overlay text:', await page.$eval('.cdk-overlay-container', element => element.innerText).catch(() => '(sin .cdk-overlay-container)'));
  try {
    await mkdir(artifactDir, { recursive: true });
    const screenshotPath = join(artifactDir, 'integration-failure.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error('Failure screenshot saved to ' + screenshotPath);
  } catch (screenshotError) {
    console.error('Failure screenshot could not be saved:', screenshotError.message);
  }
  throw error;
} finally {
  await browser.close();
}
