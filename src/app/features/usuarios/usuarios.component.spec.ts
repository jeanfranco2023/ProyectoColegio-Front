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
});
