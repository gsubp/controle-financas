import { SetMetadata } from '@nestjs/common';

export const PUBLICO = 'publico';
export const Public = () => SetMetadata(PUBLICO, true);
