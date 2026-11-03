import { Routes } from '@angular/router';
import { authGuard, initialPasswordGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { ADMIN_ROUTE_ACCESS } from './core/authorization/admin-route-access';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'matricula/inicio'
  },
  {
    path: 'matricula',
    pathMatch: 'full',
    redirectTo: 'matricula/inicio'
  },
  {
    path: 'matricula/:vista',
    loadComponent: () =>
      import('./features/matricula-publica/matricula-publica.component').then(m => m.MatriculaPublicaComponent)
  },
  {
    path: 'admision',
    pathMatch: 'full',
    redirectTo: 'matricula/inicio'
  },
  {
    path: 'admision/:vista',
    loadComponent: () =>
      import('./features/matricula-publica/matricula-publica.component').then(m => m.MatriculaPublicaComponent)
  },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/cambiar-password-inicial',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/cambiar-password-inicial/cambiar-password-inicial.component').then(
        m => m.CambiarPasswordInicialComponent
      )
  },
  {
    path: 'admin',
    canActivate: [authGuard, initialPasswordGuard],
    loadComponent: () =>
      import('./layout/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {path:'horarios',canActivate:[roleGuard(ADMIN_ROUTE_ACCESS.horarios)],loadComponent:()=>import('./features/horarios/horarios.component').then(m=>m.HorariosComponent)},
      {path:'refuerzos',canActivate:[roleGuard(ADMIN_ROUTE_ACCESS.refuerzos)],loadComponent:()=>import('./features/refuerzos/refuerzos.component').then(m=>m.RefuerzosComponent)},
      { path: 'tutoria', canActivate: [roleGuard(ADMIN_ROUTE_ACCESS.tutoria)], loadComponent: () => import('./features/stage9/seguimiento-tutoria-page.component').then(m => m.SeguimientoTutoriaPageComponent) },
      { path: 'observaciones-conductuales', canActivate: [roleGuard(ADMIN_ROUTE_ACCESS['observaciones-conductuales'])], loadComponent: () => import('./features/stage9/observaciones-faltas-page.component').then(m => m.ObservacionesFaltasPageComponent) },
      { path: 'suplencias', canActivate: [roleGuard(ADMIN_ROUTE_ACCESS.suplencias)], loadComponent: () => import('./features/stage9/suplente-apoderado-page.component').then(m => m.SuplenteApoderadoPageComponent) },
      { path: 'aprobacion-suplencias', canActivate: [roleGuard(ADMIN_ROUTE_ACCESS['aprobacion-suplencias'])], loadComponent: () => import('./features/stage9/aprobacion-suplencias-page.component').then(m => m.AprobacionSuplenciasPageComponent) },
      { path: 'portal-apoderado', canActivate: [roleGuard(ADMIN_ROUTE_ACCESS['portal-apoderado'])], loadComponent: () => import('./features/stage9/portal-apoderado-page.component').then(m => m.PortalApoderadoPageComponent) },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        canActivate: [roleGuard(ADMIN_ROUTE_ACCESS.dashboard)],
        loadComponent: () =>
          import('./features/dashboard/dashboard-dispatcher.component').then(m => m.DashboardDispatcherComponent)
      },
      {
        path: 'matriculas',
        canActivate: [roleGuard(ADMIN_ROUTE_ACCESS.matriculas)],
        loadComponent: () =>
          import('./features/matriculas/matriculas.component').then(m => m.MatriculasComponent)
      },
      {
        path: 'solicitudes-matricula',
        canActivate: [roleGuard(ADMIN_ROUTE_ACCESS['solicitudes-matricula'])],
        loadComponent: () =>
          import('./features/solicitudes-matricula/solicitudes-matricula.component').then(m => m.SolicitudesMatriculaComponent)
      },
      {
        path: 'calificaciones',
        canActivate: [roleGuard(ADMIN_ROUTE_ACCESS.calificaciones)],
        loadComponent: () =>
          import('./features/calificaciones/calificaciones.component').then(m => m.CalificacionesComponent)
      },
      {
        path: 'asistencia',
        canActivate: [roleGuard(ADMIN_ROUTE_ACCESS.asistencia)],
        loadComponent: () =>
          import('./features/asistencia/asistencia.component').then(m => m.AsistenciaComponent)
      },
      {
        path: 'tesoreria',
        canActivate: [roleGuard(ADMIN_ROUTE_ACCESS.tesoreria)],
        loadComponent: () =>
          import('./features/tesoreria/tesoreria.component').then(m => m.TesoreriaComponent)
      },
      {
        path: 'academico',
        canActivate: [roleGuard(ADMIN_ROUTE_ACCESS.academico)],
        loadComponent: () =>
          import('./features/academico/academico.component').then(m => m.AcademicoComponent)
      },
      {
        path: 'convivencia',
        canActivate: [roleGuard(ADMIN_ROUTE_ACCESS.convivencia)],
        loadComponent: () =>
          import('./features/convivencia/convivencia.component').then(m => m.ConvivenciaComponent)
      },
      {
        path: 'comunicados',
        canActivate: [roleGuard(ADMIN_ROUTE_ACCESS.comunicados)],
        loadComponent: () =>
          import('./features/comunicados/comunicados.component').then(m => m.ComunicadosComponent)
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard(ADMIN_ROUTE_ACCESS.usuarios)],
        loadComponent: () =>
          import('./features/usuarios/usuarios.component').then(m => m.UsuariosComponent)
      },
      {
        path: 'auditoria',
        canActivate: [roleGuard(ADMIN_ROUTE_ACCESS.auditoria)],
        loadComponent: () =>
          import('./features/auditoria/auditoria.component').then(m => m.AuditoriaComponent)
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/perfil/perfil.component').then(m => m.PerfilComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'matricula/inicio'
  }
];
