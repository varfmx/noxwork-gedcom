import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GedcomModule } from './gedcom/gedcom.module';
import { PrismaModule } from './prisma/prisma.module';
import { NodeModule } from './node/node.module';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    GedcomModule,
    NodeModule,
    ProjectModule,
    UsersModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
