import { ApiProperty } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  password: string;

  @ApiProperty({ example: 'John Doe' })
  full_name: string;
}

export class SignInDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  password: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ required: false })
  refreshToken?: string;

  @ApiProperty()
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
}
