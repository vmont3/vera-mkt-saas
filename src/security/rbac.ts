export type Role = 'user' | 'admin' | 'auditor' | 'industry' | 'delegate';

export const ROLES: Role[] = ['user', 'admin', 'auditor', 'industry', 'delegate'];

export const checkRole = (userRole: string, requiredRole: Role | Role[]): boolean => {
    if (Array.isArray(requiredRole)) {
        return requiredRole.includes(userRole as Role);
    }
    return userRole === requiredRole;
};
