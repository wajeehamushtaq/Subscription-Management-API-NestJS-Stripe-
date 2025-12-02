import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '@shared/schemas';

@Injectable()
export class RolesService {
  constructor(@InjectModel(Role.name) private roleModel: Model<Role>) {}

  async getAllRoles(): Promise<Role[]> {
    return this.roleModel.find().exec();
  }

  async getRoleByName(name: string): Promise<Role> {
    return this.roleModel.findOne({ name }).exec();
  }
}
