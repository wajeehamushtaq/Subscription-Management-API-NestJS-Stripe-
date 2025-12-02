import { Logger } from '@nestjs/common';
import { Connection } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Role, RoleSchema, User, UserSchema } from '@shared/schemas';

export const seedAdminMigration = {
  name: '002-seed-admin',
  up: async (connection: Connection, logger: Logger) => {
    const userModel = connection.model(User.name, UserSchema);
    const roleModel = connection.model(Role.name, RoleSchema);

    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword =
      process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123';

    const existingAdmin = await userModel.findOne({ email: adminEmail });
    if (existingAdmin) {
      logger.log(`Admin user already exists (${adminEmail}).`);
      return;
    }

    const adminRole = await roleModel.findOne({ name: 'admin' });
    if (!adminRole) {
      throw new Error(
        'Admin role not found. Run the role seeder before creating the admin user.',
      );
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await userModel.create({
      email: adminEmail,
      password: hashedPassword,
      full_name: 'System Administrator',
      role: adminRole._id,
      isActive: true,
    });

    logger.log(
      `Default admin user ensured (${adminEmail}). Use DEFAULT_ADMIN_PASSWORD to control the credential.`,
    );
  },
};

