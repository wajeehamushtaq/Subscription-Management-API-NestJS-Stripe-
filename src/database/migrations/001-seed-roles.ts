import { Logger } from '@nestjs/common';
import { Connection } from 'mongoose';
import { Role, RoleSchema } from '@shared/schemas';

export const seedRolesMigration = {
  name: '001-seed-roles',
  up: async (connection: Connection, logger: Logger) => {
    const roleModel = connection.model(Role.name, RoleSchema);

    const roles = [
      {
        name: 'admin',
        status: 'active',
        description: 'Administrator role with full access',
      },
      {
        name: 'user',
        status: 'active',
        description: 'Regular user role',
      },
    ];

    let created = 0;
    for (const role of roles) {
      const result = await roleModel.updateOne(
        { name: role.name },
        { $setOnInsert: role },
        { upsert: true },
      );

      if (result.upsertedCount && result.upsertedCount > 0) {
        created += 1;
        logger.log(`Role '${role.name}' created`);
      }
    }

    if (created === 0) {
      logger.log('Roles already exist. No new roles created.');
    } else {
      logger.log(`Seeded ${created} role(s).`);
    }
  },
};

