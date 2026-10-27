import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

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
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {path:'horarios',canActivate:[roleGuard(['DIRECCION','SECRETARIA','DOCENTE'])],loadComponent:()=>import('./features/horarios/horarios.component').then(m=>m.HorariosComponent)},
      {path:'refuerzos',canActivate:[roleGuard(['DIRECCION','SECRETARIA','DOCENTE'])],loadComponent:()=>import('./features/refuerzos/refuerzos.component').then(m=>m.RefuerzosComponent)},
      { path: 'tutoria', canActivate: [roleGuard(['DIRECCION', 'SECRETARIA', 'TUTOR', 'AUXILIAR'])], loadComponent: () => import('./features/stage9/seguimiento-tutoria-page.component').then(m => m.SeguimientoTutoriaPageComponent) },
      { path: 'observaciones-conductuales', canActivate: [roleGuard(['DIRECCION', 'SECRETARIA', 'TUTOR', 'AUXILIAR'])], loadComponent: () => import('./features/stage9/observaciones-faltas-page.component').then(m => m.ObservacionesFaltasPageComponent) },
      { path: 'suplencias', canActivate: [roleGuard(['APODERADO', 'DIRECCION', 'SECRETARIA'])], loadComponent: () => import('./features/stage9/suplente-apoderado-page.component').then(m => m.SuplenteApoderadoPageComponent) },
      { path: 'aprobacion-suplencias', canActivate: [roleGuard(['DIRECCION', 'SECRETARIA'])], loadComponent: () => import('./features/stage9/aprobacion-suplencias-page.component').then(m => m.AprobacionSuplenciasPageComponent) },
      { path: 'portal-apoderado', canActivate: [roleGuard(['APODERADO', 'DIRECCION', 'SECRETARIA'])], loadComponent: () => import('./features/stage9/portal-apoderado-page.component').then(m => m.PortalApoderadoPageComponent) },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        canActivate: [roleGuard(['DIRECCION', 'SECRETARIA'])],
        loadComponent: () =>
          import('./features/dashboard/dashboard-dispatcher.component').then(m => m.DashboardDispatcherComponent)
      },
      {
        path: 'matriculas',
        canActivate: [roleGuard(['DIRECCION', 'SECRETARIA'])],
        loadComponent: () =>
          import('./features/matriculas/matriculas.component').then(m => m.MatriculasComponent)
      },
      {
        path: 'solicitudes-matricula',
        canActivate: [roleGuard(['DIRECCION', 'SECRETARIA'])],
        loadComponent: () =>
          import('./features/solicitudes-matricula/solicitudes-matricula.component').then(m => m.SolicitudesMatriculaComponent)
      },
      {
        path: 'calificaciones',
        canActivate: [roleGuard(['DIRECCION', 'SECRETARIA', 'DOCENTE'])],
        loadComponent: () =>
          import('./features/calificaciones/calificaciones.component').then(m => m.CalificacionesComponent)
      },
      {
        path: 'asistencia',
        canActivate: [roleGuard(['DIRECCION', 'SECRETARIA', 'AUXILIAR', 'TUTOR'])],
        loadComponent: () =>
          import('./features/asistencia/asistencia.component').then(m => m.AsistenciaComponent)
      },
      {
        path: 'tesoreria',
        canActivate: [roleGuard(['DIRECCION', 'SECRETARIA', 'APODERADO'])],
        loadComponent: () =>
          import('./features/tesoreria/tesoreria.component').then(m => m.TesoreriaComponent)
      },
      {
        path: 'academico',
        canActivate: [roleGuard(['DIRECCION', 'SECRETARIA'])],
        loadComponent: () =>
          import('./features/academico/academico.component').then(m => m.AcademicoComponent)
      },
      {
        path: 'convivencia',
        canActivate: [roleGuard(['DIRECCION', 'SECRETARIA', 'AUXILIAR', 'TUTOR'])],
        loadComponent: () =>
          import('./features/convivencia/convivencia.component').then(m => m.ConvivenciaComponent)
      },
      {
        path: 'comunicados',
        canActivate: [roleGuard(['DIRECCION', 'SECRETARIA', 'APODERADO'])],
        loadComponent: () =>
          import('./features/comunicados/comunicados.component').then(m => m.ComunicadosComponent)
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard(['DIRECCION', 'SECRETARIA'])],
        loadComponent: () =>
          import('./features/usuarios/usuarios.component').then(m => m.UsuariosComponent)
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
