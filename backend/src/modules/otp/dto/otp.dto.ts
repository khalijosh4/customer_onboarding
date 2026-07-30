import { IsNotEmpty, IsString, Length } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @Length(4, 8)
  code: string;

  @IsString()
  @IsNotEmpty()
  applicationId: string;
}
