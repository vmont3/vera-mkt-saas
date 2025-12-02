export interface ValidationResult {
    valid: boolean;
    errors?: { field: string; message: string }[];
}

export class AssetTemplateValidatorService {

    /**
     * Validate metadata against a template schema
     */
    validateMetadata(template: any, metadata: any): ValidationResult {
        const errors: { field: string; message: string }[] = [];
        const schema = template.schema;

        if (!schema || !schema.fields) {
            return { valid: true }; // No schema, no validation (legacy support)
        }

        for (const field of schema.fields) {
            const value = metadata[field.name];

            // 1. Check Required
            if (field.required && (value === undefined || value === null || value === '')) {
                errors.push({ field: field.name, message: 'Field is required' });
                continue;
            }

            // Skip type check if optional and missing
            if (value === undefined || value === null) continue;

            // 2. Check Type
            switch (field.type) {
                case 'string':
                    if (typeof value !== 'string') {
                        errors.push({ field: field.name, message: 'Must be a string' });
                    }
                    break;
                case 'number':
                    if (typeof value !== 'number' || isNaN(value)) {
                        errors.push({ field: field.name, message: 'Must be a number' });
                    }
                    break;
                case 'boolean':
                    if (typeof value !== 'boolean') {
                        errors.push({ field: field.name, message: 'Must be a boolean' });
                    }
                    break;
                case 'date':
                    if (isNaN(Date.parse(value))) {
                        errors.push({ field: field.name, message: 'Must be a valid date string' });
                    }
                    break;
                case 'enum':
                    if (!field.options || !field.options.includes(value)) {
                        errors.push({ field: field.name, message: `Must be one of: ${field.options?.join(', ')}` });
                    }
                    break;
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }
}
