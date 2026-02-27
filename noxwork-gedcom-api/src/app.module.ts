import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GedcomModule } from './gedcom/gedcom.module';
import { PrismaModule } from './prisma/prisma.module';
import { NodeModule } from './node/node.module';

@Module({
  imports: [PrismaModule, GedcomModule, NodeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
