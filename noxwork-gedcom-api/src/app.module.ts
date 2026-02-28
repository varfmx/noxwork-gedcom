import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GedcomModule } from './gedcom/gedcom.module';
import { PrismaModule } from './prisma/prisma.module';
import { NodeModule } from './node/node.module';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [PrismaModule, AuthModule, GedcomModule, NodeModule, ProjectModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
