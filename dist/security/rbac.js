"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRole = exports.ROLES = void 0;
exports.ROLES = ['user', 'admin', 'auditor', 'industry', 'delegate'];
const checkRole = (userRole, requiredRole) => {
    if (Array.isArray(requiredRole)) {
        return requiredRole.includes(userRole);
    }
    return userRole === requiredRole;
};
exports.checkRole = checkRole;
