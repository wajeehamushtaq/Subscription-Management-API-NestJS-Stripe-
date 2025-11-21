import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, User } from '@shared/schemas';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class RolesService {
  private logger = new Logger(RolesService.name);

  constructor(
    @InjectModel(Role.name) private roleModel: Model<Role>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async seedRoles(): Promise<void> {
    try {
      const count = await this.roleModel.countDocuments();
      if (count === 0) {
        await this.roleModel.create([
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
        ]);
        this.logger.log('Roles seeded successfully');
      }

      // Seed default admin user
      const adminExists = await this.userModel.findOne({
        email: 'admin@example.com',
      });
      if (!adminExists) {
        const adminRole = await this.roleModel.findOne({ name: 'admin' });
        const hashedPassword = await bcrypt.hash('Admin@123', 10);
        await this.userModel.create({
          email: 'admin@example.com',
          password: hashedPassword,
          full_name: 'System Administrator',
          role: adminRole._id,
          isActive: true,
        });
        this.logger.log(
          'Default admin user created: admin@example.com / Admin@123',
        );
      }
    } catch (error) {
      this.logger.error('Error seeding roles:', error);
    }
  }

  async getAllRoles(): Promise<Role[]> {
    return this.roleModel.find().exec();
  }

  async getRoleByName(name: string): Promise<Role> {
    return this.roleModel.findOne({ name }).exec();
  }
}
