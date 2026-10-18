# Pendientes de entrega del frontend

Fecha: 2026-10-17

Rama revisada: `mejora-visual`

Contrato backend contrastado con `origin/chore/limpieza-deps` (`e4c119a`).

## Decisiones para Jean

| Tema | Estado actual y decisión requerida |
|---|---|
| Comprobante en Tesorería | `ObligacionResponseDto` no incluye `comprobanteNumero`; por eso la columna muestra `—`. Añadir el campo o aceptar esa presentación. |
| Defaults de Tesorería | El formulario inicia con `matriculaId = 1`, conceptos `0`, primer vencimiento vacío y filtro `TODOS`. Al cargar conceptos selecciona el primero disponible; si no hay, queda `0`. Para datos incompletos, importes nulos se convierten a `0`, descripción vacía a `Cuota #<número>` (o `Cuota #1`), fecha vacía a `—` y estado vacío a `PENDIENTE`. Confirmar que la API garantiza esos datos para que los defaults no parezcan datos reales. |
| Copy para apoderados | Tesorería muestra: “El selector de estudiante, el estado de cuenta detallado y el reporte de notas estarán disponibles cuando el backend habilite la consulta vinculada al apoderado.” Decidir si se conserva el mensaje técnico o se cambia por una explicación dirigida a familias cuando exista el servicio. |
| Crear cuenta / E2E | El botón visible ahora dice `Crear Cuenta en BD`, igual que el texto que busca `scripts/module_integration_e2e.mjs:328`. El script permanece intacto. |
| Comunicados: destinatario y acuse | El DTO que devuelve la bandeja APODERADO no trae el alcance del comunicado ni el acuse confirmado. La UI muestra `Destinatario no informado` para no afirmar un destinatario que la API no expone, y conserva el acuse en `sessionStorage` por usuario hasta que se cierre la sesión del navegador. Añadir alcance y estado de acuse a la respuesta de la bandeja. |
| Aulas por nivel | La pantalla lista aulas físicas de `/api/v1/academico/aulas`; son entidades distintas de las secciones. Se corrigió el filtro local para usar los prefijos reales `AULA_I_`, `AULA_P_` y `AULA_S_`. La API local devolvió 14 aulas y 14 secciones; una sección tiene id 9. |
| Dashboard y nulos | Métricas nulas se muestran como `—`; si la lectura falla, quedan en `—` y termina la carga. Si el backend omite `anio` en una respuesta exitosa, la UI usa el año del reloj del cliente. Confirmar si ese fallback es el comportamiento deseado. El DTO actual del backend usa tipos primitivos para varias métricas y puede devolver cero. |
| Etapa 9 | Los cinco componentes siguen siendo presentación y no hacen solicitudes HTTP. Los 13 endpoints propuestos y su estado están documentados en la nota del Vault `04_Notas_Obsidian/Contrato-Front-Back-Actualizado-2026-10-17.md`; todos faltan con esa ruta/contrato exactos en `chore/limpieza-deps`. |
| PR backend | La propuesta de integración debe basarse en `chore/limpieza-deps`; no en `main`. |

### Estado de endpoints de Etapa 9

| Pantalla | Endpoints propuestos | Estado en `chore/limpieza-deps` |
|---|---|---|
| Portal APODERADO | `GET /api/v1/apoderado/hijos`; `GET .../hijos/{id}/notas`; `GET .../hijos/{id}/reporte-notas.pdf`; `GET .../hijos/{id}/estado-cuenta` | Los cuatro faltan. Hay endpoints cercanos de libreta y tesorería, pero no admiten el mismo rol/caso de uso. |
| Observaciones DOCENTE/TUTOR | `GET, POST /api/v1/observaciones-faltas` | Ambos faltan. `/api/v1/convivencia/incidencias` es otro recurso y no autoriza DOCENTE. |
| Suplencias APODERADO | `GET, POST /api/v1/apoderado/hijos/{id}/suplencias` | Ambos faltan. |
| Aprobación DIRECCION | `GET /api/v1/direccion/suplencias`; `POST /api/v1/direccion/suplencias/{id}/decision`; `POST .../{id}/revocacion` | Los tres faltan. |
| Seguimiento TUTOR | `GET /api/v1/tutor/estudiantes`; `GET /api/v1/tutor/estudiantes/{id}/seguimiento` | Ambos faltan. |

Rutas cercanas ya existentes: `GET /api/v1/tesoreria/mis-obligaciones` (APODERADO); `GET /api/v1/evaluacion/libreta/{matriculaId}` (Dirección, Secretaría, Docente); `GET /api/v1/tesoreria/estudiantes/{id}/estado-cuenta` (Dirección/Secretaría); y consultas de incidencias de convivencia (Dirección, Secretaría, Auxiliar, Tutor). No sustituyen los contratos propuestos ni verifican por sí solas la relación apoderado–hijo.

## Pendientes visuales y de verificación

- Sustituir el escudo actual cuando el colegio entregue el original en alta resolución y confirme el texto institucional correcto.
- Incorporar fotografías reales de la comunidad; la landing conserva el estado “Próximamente” hasta recibirlas.
- Ejecutar los scripts E2E contra el backend real una vez que estén disponibles sus servicios y datos. No se ejecutaron en este cierre.
- Confirmar con el colegio el copy dirigido a apoderados y las reglas/valores por defecto de Tesorería.

## Auditoría final registrada

- Código y ramas: verificado sobre `mejora-visual`; backend consultado en `origin/chore/limpieza-deps` (`e4c119a`). IDs de API numéricos (`Long` en Java, con `Short` para `conceptoId`); roles `DIRECCION`, `SECRETARIA`, `DOCENTE`, `AUXILIAR`, `TUTOR`, `APODERADO`. `GET /api/v1/dashboard/resumen` acepta solo `DIRECCION`/`SECRETARIA`.
- Tailwind: `src/styles.css` tiene 209 líneas y es el único CSS fuente en `src`; no hay selectores `.ui-*` ni `@utility`, ni tokens utilitarios de página. Tampoco hay clases propias `ui-*` en plantillas. Los nombres de componentes como `<ui-status-badge>`, el pipe `uiDatePe`, el fallback Tailwind `ui-sans-serif` y tokens `--color-ui-*` son componentes, pipe, font stack y variables; no son clases propias `ui-*`.
- Grep reproducible (desde la raíz del frontend): `rg -n '@utility|\.ui-[[:alnum:]_-]+' src --glob '*.css'` y `rg -n --pcre2 'class="(?:ui-[a-z0-9_-]+|[^" ]*\sui-[a-z0-9_-]+)' src/app --glob '*.html' --glob '*.ts'`: sin coincidencias. `rg -n 'console\.log' src`: sin coincidencias. Se mantienen nombres de componentes `<ui-…>`, el pipe `uiDatePe`, IDs ARIA `ui-…`, el token Tailwind `ui-sans-serif` y tokens CSS `--color-ui-*`; no son clases de estilo.
- Contraste: se midieron combinaciones clave y se oscurecieron textos de bajo contraste encontrados. Referencias calculadas: blanco sobre `#2563eb` 5.17:1; `#102447` sobre `#c49a58` 5.94:1; `#64748b` sobre blanco 4.76:1; badges de estado verde/ámbar/rojo usan tonos oscuros sobre fondos claros. El dorado `#a47737` en iconos sobre `#fbf3e7` mide 3.62:1 (icono no textual). El foco visible global tiene contorno de 3 px y separación de 2 px.
- Controles: se revisaron 102 campos de entrada/select/textarea en plantillas; todos tienen nombre accesible explícito o etiqueta visible asociada. Se elevaron a 44 px los 41 botones que declaraban una altura base de 40 px; los controles Material, navegación y acciones de tablas tienen reglas de 44 px en `styles.css`. No se alteró lógica.
- Console/dead code: no hay `console.log` en `src`; 9 scripts `.mjs` sí los usan para informar el avance de pruebas/seeding y no se tocaron. No hay un analizador dedicado de código muerto configurado. El cierre no introdujo lógica ni código de ejecución sin uso; `ng build` compiló sin errores.
- Dependencias: `npm audit` informa **7 vulnerabilidades (5 high, 2 critical)** en dependencias existentes: `@angular/router`, `@modelcontextprotocol/sdk`, `http-cache-semantics`, `piscina` y `source-map-js`. No se ejecutó `npm audit fix`; `package.json` y lockfile no se modificaron.
- Bundle: inicial **585.16 kB** frente al límite de **500.00 kB** (+**85.16 kB**); transferencia estimada 121.52 kB. Propuesta para otra tarea: lazy loading de rutas/componentes que aún estén en el chunk inicial y sustituir imports amplios de Angular Material por imports standalone puntuales. No se aplicó aquí.
- Build: `ng build` — éxito; se mantiene la advertencia del presupuesto inicial indicada arriba.
- Pruebas: `ng test --watch=false` — **3 archivos pasaron, 11 pruebas pasaron**.
- E2E: no ejecutados contra el backend real; queda pendiente cuando Jean disponga de un entorno integrado.

## Actualización de integración local — 2026-10-17

- Usuarios: el selector de alta ya ofrece `APODERADO` y el botón de envío muestra `Crear Cuenta en BD`, coincidente con `scripts/module_integration_e2e.mjs:328`. El alta de `apoderado2.prueba@test.local` sigue pendiente: el inicio de sesión de DIRECCION está abierto en `http://localhost:5173/auth/login` para que el titular introduzca sus credenciales; todavía no se confirmó la sesión. No se buscó ni se usó una contraseña de Dirección.
- Calificaciones: el SVG del aviso de guardado estaba sin dimensiones y se mostraba a 93 × 93 px; quedó en 20 × 20 px. Las capturas antes/después a 375 y 1440 px están en `integration-ui-fixes-captures`. Se revisaron avisos de Matrículas, Asistencia, Convivencia, Tesorería, Comunicados y Usuarios: los encontrados son texto sin SVG y no comparten el defecto.
- Menú: no requirió cambio. El código y la prueba unitaria ya restringen `Panel general` a DIRECCION/SECRETARIA. En login normal de SECRETARIA, DOCENTE, AUXILIAR, TUTOR y APODERADO se confirmó visibilidad solo para SECRETARIA; la sesión de DIRECCION queda pendiente de la verificación anterior.
- Aulas: no es una diferencia entre aula física y sección, ni un problema de endpoint. `/api/v1/academico/aulas` devuelve 14 aulas físicas con códigos `AULA_I_`, `AULA_P_` y `AULA_S_`; el filtro del frontend comparaba prefijos incorrectos. El mapeo por nivel se corrigió y la pantalla de Secretaría mostró 3 aulas de Inicial.
- Comunicados: la bandeja APODERADO no devuelve alcance/destinatario ni `acuseConfirmado`; el POST de acuse sí devuelve `acuseConfirmado`. La UI evita el guion ambiguo con `Destinatario no informado` (el badge lo representa en mayúsculas por estilo) y cambia a `Lectura confirmada`, deshabilitado. Se comprobó que persiste tras recargar en la sesión actual mediante `sessionStorage`; queda pendiente que backend devuelva ambos datos en la bandeja para persistencia del servidor.
- Responsive/runtime: Calificaciones, Académico y Comunicados se comprobaron por login normal en 320, 375, 768 y 1440 px. `documentElement.scrollWidth` y `body.scrollWidth` coincidieron con el ancho del viewport en las 12 combinaciones. No hubo `pageerror`; el ícono de éxito midió 20 × 20 px en los cuatro anchos. Las capturas adicionales 320 y 768 se guardaron junto con las de antes/después.
- Backend pendiente: consulta de estado de cuenta vinculada apoderado–hijo y los 13 endpoints propuestos para las cinco pantallas de Etapa 9 siguen ausentes con ese contrato en `chore/limpieza-deps`.
- E2E: no se modificaron los scripts y no se ejecutó `scripts/*.mjs` en esta corrección. `npm test -- --watch=false` pasó 3 archivos y 11 pruebas. El origen `127.0.0.1:5173` devuelve `403 Invalid CORS request`; las comprobaciones por UI normal se hicieron usando `http://localhost:5173`.

