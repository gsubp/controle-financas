import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';

const normalizarEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const aparar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CadastroDto {
  @Transform(aparar)
  @IsString()
  @Length(1, 100)
  nome: string;

  @Transform(normalizarEmail)
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @IsString()
  @Length(8, 72, { message: 'A senha deve ter entre 8 e 72 caracteres' })
  senha: string;
}

export class LoginDto {
  @Transform(normalizarEmail)
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  senha: string;
}
