import { PrismaClient } from '@prisma/client';

const SUPABASE_DB_URL = "postgresql://postgres.wrsxyfenrjlccrpabhje:Waseemsir%40786@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
  process.env.DATABASE_URL = SUPABASE_DB_URL;
}

let prisma;

if (!global.__prismaInstance) {
  global.__prismaInstance = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || SUPABASE_DB_URL,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
  });
}

prisma = global.__prismaInstance;

export default prisma;
