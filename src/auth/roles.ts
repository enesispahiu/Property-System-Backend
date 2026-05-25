export const Roles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  USER: 'USER',
} as const;

export type AppRole = (typeof Roles)[keyof typeof Roles];

export const ADMIN_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN] as const;
