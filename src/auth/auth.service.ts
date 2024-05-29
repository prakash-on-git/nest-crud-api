import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthDto } from "./dto";
import * as argon from "argon2";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import {JwtService} from '@nestjs/jwt';
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
    constructor (private prisma: PrismaService, private jwt: JwtService, private config: ConfigService) {}
    
    async signup(dto: AuthDto) {
        // hash password
        const hash = await argon.hash(dto.password);
        try {
            // save in db
            const user = await this.prisma.user.create({
                data: { email: dto.email, hash: hash, },
                select: { id: true, email: true, createdAt: true, }
            });
            // return confirmation token
            return this.signinToken(user.id, user.email);

        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ForbiddenException('Credentials already taken');
                }
            }
            throw error;
        }
    }

    async signin(dto: AuthDto) {
        const user = await this.prisma.user.findUnique({
            where: {
                email: dto.email,
            },
        });

        if (!user) throw new ForbiddenException('credentials incorrect');

        const passwordCorrect = await argon.verify(String(user.hash), String(dto.password));

        if (!passwordCorrect) throw new ForbiddenException('credentials incorrect :(');

        return this.signinToken(user.id, user.email);
    }

    async signinToken( userId: number, email: string, ): Promise<{ access_token: string }> {
        const payload = { sub: userId, email, };

        const secret = this.config.get('JWT_SECRET');
    
        const token = await this.jwt.signAsync(
          payload,
          { expiresIn: '15m', secret: secret, },
        );
    
        return {
          access_token: token,
        };
      }

}
