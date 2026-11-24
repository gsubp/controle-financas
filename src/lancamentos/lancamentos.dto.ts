import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsString, Length, Matches, Max, Min, ValidateBy } from 'class-validator';
import { TipoLancamento } from '../generated/prisma/client.js';
import { dataValida, MES_REGEX } from './mes.js';

export class MesQueryDto {
  @Matches(MES_REGEX, { message: 'Mês inválido (use AAAA-MM)' })
  mes: string;
}

export class CriarLancamentoDto {
  @IsEnum(TipoLancamento, { message: 'Tipo deve ser RECEITA ou DESPESA' })
  tipo: TipoLancamento;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 120, { message: 'Informe a descrição (até 120 caracteres)' })
  descricao: string;

  @IsString({ message: 'Informe a categoria' })
  categoria: string;

  @IsInt({ message: 'O valor deve ser um número inteiro de centavos' })
  @Min(1, { message: 'O valor deve ser maior que zero' })
  @Max(2_000_000_000, { message: 'O valor máximo é R$ 20.000.000,00' })
  valorCentavos: number;

  @ValidateBy({
    name: 'dataValida',
    validator: { validate: dataValida, defaultMessage: () => 'Data inválida (use AAAA-MM-DD)' },
  })
  data: string;
}

// skipNullProperties: false → `null` é validado (e recusado) em vez de chegar ao Prisma como 500.
export class AtualizarLancamentoDto extends PartialType(CriarLancamentoDto, { skipNullProperties: false }) {}
