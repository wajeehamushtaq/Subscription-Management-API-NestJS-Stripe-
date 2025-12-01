import { Logger } from '@nestjs/common';
import { config as loadEnv } from 'dotenv';
import { Connection, createConnection } from 'mongoose';
import { seedRolesMigration } from '../migrations/001-seed-roles';
import { seedAdminMigration } from '../migrations/002-seed-admin';

loadEnv({ path: '.env' });

type Migration = {
  name: string;
  up: (connection: Connection, logger: Logger) => Promise<void>;
};

const migrations: Migration[] = [seedRolesMigration, seedAdminMigration];

async function bootstrap() {
  const logger = new Logger('DatabaseSeeder');
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined. Please set it in your environment.');
  }

  logger.log('Connecting to MongoDB...');
  const connection = await createConnection(mongoUri).asPromise();

  try {
    for (const migration of migrations) {
      logger.log(`Running ${migration.name}`);
      await migration.up(connection, logger);
    }

    logger.log('Database seeding completed successfully.');
  } finally {
    await connection.close();
    logger.log('MongoDB connection closed.');
  }
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Database seeding failed:', error);
  process.exit(1);
});

