import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from './role.schema';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string; // bcrypt hashed

  @Prop({ required: true })
  full_name: string;

  @Prop({ type: Types.ObjectId, ref: 'Role', required: true })
  role: Role;

  @Prop({ default: null })
  stripeCustomerId?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null })
  refreshTokenHash?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Configure JSON transformation to exclude internal fields and password
UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    delete ret._id;
    delete ret.password; // Never expose password in JSON responses
    delete ret.refreshTokenHash;
    ret.id = doc._id.toString();
    return ret;
  },
});
