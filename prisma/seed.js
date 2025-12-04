"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Start seeding ...');
    // Create Admin User
    const adminEmail = 'admin@quantumcert.com';
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            password: '$2b$10$EpIxT.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8', // Placeholder bcrypt hash
            kycStatus: 'verified',
        },
    });
    console.log(`Created user with id: ${admin.id}`);
    // Create Test Partner
    const partnerSlug = 'quantum-cert-demo';
    const partner = await prisma.partner.upsert({
        where: { slug: partnerSlug },
        update: {},
        create: {
            name: 'Quantum Cert Demo Partner',
            slug: partnerSlug,
            segment: 'technology',
            config: {
                create: {
                    config: {
                        description: 'Default demo configuration',
                        assetSchema: {},
                        lifecycle: {},
                        partnerRules: {}
                    }
                }
            }
        },
    });
    console.log(`Created partner with id: ${partner.id}`);
    console.log('Seeding finished.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
