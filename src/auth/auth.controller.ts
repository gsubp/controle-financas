import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { CadastroDto, LoginDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';
import { Public } from './publico.decorator.js';
import { UsuarioId } from './usuario-id.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('cadastro')
  cadastrar(@Body() dto: CadastroDto) {
    return this.auth.cadastrar(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  entrar(@Body() dto: LoginDto) {
    return this.auth.entrar(dto);
  }

  @Get('me')
  me(@UsuarioId() usuarioId: string) {
    return this.auth.me(usuarioId);
  }
}
