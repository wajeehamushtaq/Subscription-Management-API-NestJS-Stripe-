import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '@shared/schemas';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findAll(): Promise<User[]> {
    return this.userModel
      .find()
      .populate('role', 'name status')
      .select('-password')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<User> {
    return this.userModel
      .findById(id)
      .populate('role', 'name status')
      .select('-password')
      .exec();
  }

  async findByEmail(email: string): Promise<User> {
    return this.userModel.findOne({ email }).populate('role').exec();
  }
}
