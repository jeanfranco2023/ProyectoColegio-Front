import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../core/state/auth.store';
import { UsuarioService } from '../../core/services/usuario.service';
import { UserResponseDto } from '../../core/models/auth.model';
import { UsuariosComponent } from './usuarios.component';

describe('UsuariosComponent', () => {
  it('muestra la fila suspendida y reemplaza inmutablemente el usuario al confirmar', async () => {
    const originalUser: UserResponseDto = {
      id: 37,
      username: 'auxiliar-prueba',
      email: 'auxiliar-prueba@example.test',
      activo: true,
      roles: [{ id: 4, codigo: 'AUXILIAR', nombre: 'Auxiliar' }],
      createdAt: '',
      updatedAt: '',
    };
    const usuarioService = {
      listarUsuarios: vi.fn(() => of([originalUser])),
      cambiarEstado: vi.fn((_id: number, activo: boolean) => of({ ...originalUser, activo })),
    };

    await TestBed.configureTestingModule({
      imports: [UsuariosComponent],
      providers: [
        { provide: UsuarioService, useValue: usuarioService },
        { provide: AuthStore, useValue: { hasRole: () => false } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(UsuariosComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    const originalList = component.usuarios();
    const rowUser = originalList[0];
    const dialogRef = { close: vi.fn() };
    (component as unknown as { estadoDialogRef: typeof dialogRef }).estadoDialogRef = dialogRef;
    component.usuarioPendienteEstado.set(rowUser);

    component.confirmarCambioEstado();
    fixture.detectChanges();

    const stateCell = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('tbody tr td[data-label="Estado en BD"]');
    expect(stateCell?.textContent?.trim()).toBe('SUSPENDIDO');
    expect(component.usuarios()).not.toBe(originalList);
    expect(component.usuarios()[0]).not.toBe(rowUser);
    expect(rowUser.activo).toBe(true);
    expect(dialogRef.close).toHaveBeenCalledOnce();
  });

  it('no envía solicitud de crear usuario si la contraseña tiene menos de 8 caracteres', async () => {
    const usuarioService = {
      listarUsuarios: vi.fn(() => of([])),
      crearUsuario: vi.fn(() => of(void 0)),
    };

    await TestBed.configureTestingModule({
      imports: [UsuariosComponent],
      providers: [
        { provide: UsuarioService, useValue: usuarioService },
        { provide: AuthStore, useValue: { hasRole: () => false } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(UsuariosComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.nuevoUsername = 'nuevo.docente';
    component.nuevoEmail = 'docente@colegio.edu.pe';
    component.nuevoPassword = '1234567'; // 7 caracteres (< 8)

    component.guardarNuevoUsuario();

    expect(usuarioService.crearUsuario).not.toHaveBeenCalled();
    expect(component.creando()).toBe(false);
  });

  it('muestra solo roles sin especialidades ni fecha creación en la tabla y reemplaza DNI/nombre por Detalles', async () => {
    const docente: UserResponseDto = {
      id: 15,
      username: 'doc.prim.com3',
      nombreCompleto: 'Lucía Fernández Ramos',
      email: 'doc.prim.com3@shuji.test',
      dni: '41880101',
      activo: true,
      roles: [{ id: 3, codigo: 'DOCENTE', nombre: 'Docente' }],
      especialidad: 'Comunicación',
      areasCurriculares: [
        { id: 10, nivelId: 2, nivelNombre: 'Primaria', codigo: 'COM', nombre: 'Comunicación' },
        { id: 11, nivelId: 2, nivelNombre: 'Primaria', codigo: 'MAT', nombre: 'Matemática' }
      ],
      createdAt: '2026-11-07T13:11:00',
      updatedAt: '2026-11-20T10:00:00',
    };
    const usuarioService = {
      listarUsuarios: vi.fn(() => of([docente])),
    };

    await TestBed.configureTestingModule({
      imports: [UsuariosComponent],
      providers: [
        { provide: UsuarioService, useValue: usuarioService },
        { provide: AuthStore, useValue: { hasRole: (r: string) => r === 'DIRECCION' } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(UsuariosComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const headers = Array.from(el.querySelectorAll('thead th')).map(th => th.textContent?.trim());
    expect(headers).toContain('Roles');
    expect(headers).not.toContain('Roles & Especialidad');
    expect(headers).not.toContain('Fecha Creación');

    const rolesCellText = el.querySelector('tbody tr td[data-label="Roles"]')?.textContent ?? '';
    expect(rolesCellText).toContain('DOCENTE');
    expect(rolesCellText).not.toContain('Comunicación');
    expect(rolesCellText).not.toContain('Matemática');

    const accionText = el.querySelector('tbody tr td[data-label="Acción"]')?.textContent ?? '';
    expect(accionText).toContain('Detalles');
    expect(accionText).toContain('Editar');
    expect(accionText).toContain('Suspender');
    expect(accionText).not.toContain('DNI / nombre');
  });

  it('precarga todos los datos al editar y permite guardar docente con DNI numérico válido', async () => {
    const docente: UserResponseDto = {
      id: 21,
      username: 'doc.ini.ps',
      nombreCompleto: 'María Torres Vela',
      email: 'maria.torres@shuji.test',
      dni: '41880109',
      telefono: '987654321',
      direccion: 'Av. Los Próceres 450',
      tipoContrato: 'CAS_ESPECIAL',
      estadoLaboral: 'ACTIVO',
      codigoModular: 'CM-2026',
      numeroColegiatura: 'CPPe-991',
      especialidad: 'Personal Social',
      activo: true,
      roles: [{ id: 3, codigo: 'DOCENTE', nombre: 'Docente' }],
      areasCurriculares: [
        { id: 1, nivelId: 1, nivelNombre: 'Inicial', codigo: 'PS', nombre: 'Personal Social' }
      ],
      createdAt: '2026-11-07T13:11:00',
      updatedAt: '2026-11-20T10:00:00',
    };
    const actualizado = { ...docente, direccion: 'Av. Central 999' };
    const usuarioService = {
      listarUsuarios: vi.fn(() => of([docente])),
      actualizarUsuario: vi.fn(() => of(actualizado)),
    };

    await TestBed.configureTestingModule({
      imports: [UsuariosComponent],
      providers: [
        { provide: UsuarioService, useValue: usuarioService },
        { provide: AuthStore, useValue: { hasRole: (r: string) => r === 'ADMINISTRADOR' } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(UsuariosComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.abrirModalDetalles(docente);
    expect(component.usuarioDetalle()?.dni).toBe('41880109');
    (component as unknown as { detallesUsuarioDialogRef?: { close: () => void } }).detallesUsuarioDialogRef?.close();

    component.abrirModalEditarUsuario(docente);
    expect(component.editDni).toBe('41880109');
    expect(component.editNombreCompleto).toBe('María Torres Vela');
    expect(component.editTelefono).toBe('987654321');
    expect(component.editDireccion).toBe('Av. Los Próceres 450');
    expect(component.editTipoContrato).toBe('CAS_ESPECIAL');
    expect(component.editCodigoModular).toBe('CM-2026');
    expect(component.editNumeroColegiatura).toBe('CPPe-991');
    expect(component.editCursosSeleccionados().length).toBe(1);

    component.editDireccion = 'Av. Central 999';
    component.guardarEdicionUsuario();

    expect(component.error()).toBeNull();
    expect(usuarioService.actualizarUsuario).toHaveBeenCalledWith(
      21,
      expect.objectContaining({
        dni: '41880109',
        direccion: 'Av. Central 999',
        areaCurricularIds: [1]
      })
    );
  });

  it('oculta del selector los cursos ya elegidos y permite selección masiva por nivel', async () => {
    const docente: UserResponseDto = {
      id: 30,
      username: 'doc.sec',
      nombreCompleto: 'Carlos Mendoza',
      email: 'carlos@shuji.test',
      dni: '41880102',
      activo: true,
      roles: [{ id: 3, codigo: 'DOCENTE', nombre: 'Docente' }],
      areasCurriculares: [
        { id: 20, nivelId: 3, nivelNombre: 'Secundaria', codigo: 'MAT', nombre: 'Matemática' }
      ],
      createdAt: '',
      updatedAt: '',
    };
    const areasSecundaria = [
      { id: 20, nivelId: 3, codigo: 'MAT', nombre: 'Matemática' },
      { id: 21, nivelId: 3, codigo: 'COM', nombre: 'Comunicación' },
      { id: 22, nivelId: 3, codigo: 'CYT', nombre: 'Ciencia y Tecnología' }
    ];
    const usuarioService = {
      listarUsuarios: vi.fn(() => of([docente])),
      listarNiveles: vi.fn(() => of([{ id: 3, codigo: 'SECUNDARIA', nombre: 'Secundaria' }])),
      listarAreas: vi.fn(() => of(areasSecundaria)),
    };

    await TestBed.configureTestingModule({
      imports: [UsuariosComponent],
      providers: [
        { provide: UsuarioService, useValue: usuarioService },
        { provide: AuthStore, useValue: { hasRole: (r: string) => r === 'ADMINISTRADOR' } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(UsuariosComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.abrirModalEditarUsuario(docente);
    expect(component.cursosDisponiblesEditar().map(a => a.id)).toEqual([21, 22]);

    component.editAreaPendienteId = 21;
    component.agregarCursoSeleccionado('editar');
    expect(component.cursosDisponiblesEditar().map(a => a.id)).toEqual([22]);

    component.quitarCursoSeleccionado(21, 'editar');
    expect(component.cursosDisponiblesEditar().map(a => a.id)).toEqual([21, 22]);

    component.abrirSelectorCursosMasivo('editar');
    component.seleccionarTodosNivelMasivo();
    component.confirmarCursosMasivos();

    expect(component.editCursosSeleccionados().map(c => c.id)).toEqual([20, 21, 22]);
    expect(component.cursosDisponiblesEditar()).toEqual([]);
  });
});
