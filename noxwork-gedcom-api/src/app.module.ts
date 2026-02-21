import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GedcomModule } from './gedcom/gedcom.module';

@Module({
  imports: [GedcomModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
