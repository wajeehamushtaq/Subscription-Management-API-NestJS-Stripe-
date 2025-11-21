import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Role extends Document {
  @Prop({ required: true, unique: true })
  name: string; // 'admin' or 'user'

  @Prop({ default: 'active', enum: ['active', 'inactive'] })
  status: string;

  @Prop()
  description?: string;
}

export const RoleSchema = SchemaFactory.createForClass(Role);

// Configure JSON transformation to exclude internal fields
RoleSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    delete ret._id;
    ret.id = doc._id.toString();
    return ret;
  },
});
