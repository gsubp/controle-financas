import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CadastroDto, LoginDto } from './auth.dto.js';
import { hashSenha, verificarSenha } from './senha.js';

export type UsuarioPublico = { id: string; nome: string; email: string };
export type RespostaAuth = { token: string; usuario: UsuarioPublico };

const PUBLICO = { id: true, nome: true, email: true } as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async cadastrar(dto: CadastroDto): Promise<RespostaAuth> {
    try {
      const usuario = await this.prisma.usuario.create({
        data: { nome: dto.nome, email: dto.email, senhaHash: await hashSenha(dto.senha) },
        select: PUBLICO,
      });
      return this.resposta(usuario);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('E-mail já cadastrado');
      }
      throw e;
    }
  }

  async entrar(dto: LoginDto): Promise<RespostaAuth> {
    const usuario = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (!usuario || !(await verificarSenha(dto.senha, usuario.senhaHash))) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    return this.resposta({ id: usuario.id, nome: usuario.nome, email: usuario.email });
  }

  async me(usuarioId: string): Promise<UsuarioPublico> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId }, select: PUBLICO });
    if (!usuario) throw new UnauthorizedException();
    return usuario;
  }

  private async resposta(usuario: UsuarioPublico): Promise<RespostaAuth> {
    return { token: await this.jwt.signAsync({ sub: usuario.id }), usuario };
  }
}
