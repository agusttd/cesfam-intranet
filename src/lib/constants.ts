export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export enum Role {
  ADMIN = 'ADMIN',
  SUBDIRECCION = 'SUBDIRECCION',
  DIRECCION = 'DIRECCION',
  JEFE = 'JEFE',
  FUNCIONARIO = 'FUNCIONARIO',
}