import { PrismaClient, NTAG424Config, Prisma } from "@prisma/client";
import { getPrismaClient } from "../database";

export class ConfigRepository {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = getPrismaClient();
    }

    async create(data: Prisma.NTAG424ConfigCreateInput): Promise<NTAG424Config> {
        return this.prisma.nTAG424Config.create({
            data
        });
    }

    async findById(id: string): Promise<NTAG424Config | null> {
        return this.prisma.nTAG424Config.findUnique({
            where: { id }
        });
    }
}
