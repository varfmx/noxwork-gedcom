import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * MailModule — provides MailService globally so any other module can inject it
 * without re-importing MailModule.
 *
 * Import MailModule once in AppModule and then inject MailService anywhere.
 */
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
