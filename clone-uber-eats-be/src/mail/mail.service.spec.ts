import { Test } from '@nestjs/testing';
import { MailService } from './mail.service';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import got from 'got';
import * as FormData from 'form-data';
import { error } from 'console';

jest.mock('got');
jest.mock('form-data');

const TEST_DOMAIN = 'test-DOMAIN';
const TEST_APIKEY = 'test-API_KEY';

describe('MailService', () => {
  let service: MailService;
  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: CONFIG_OPTIONS,
          useValue: {
            apiKey: TEST_APIKEY,
            domain: TEST_DOMAIN,
            fromEmail: 'test-FROM_EMAIL',
          },
        },
      ],
    }).compile();
    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    it('should call sendEmail', () => {
      const sendVerificationEmailArgs = {
        email: 'email',
        code: 'code',
      };
      jest.spyOn(service, 'sendEmail').mockImplementation(async () => true);
      service.sendVerificationEmail(
        sendVerificationEmailArgs.email,
        sendVerificationEmailArgs.code,
      );
      expect(service.sendEmail).toHaveBeenCalledTimes(1);
      expect(service.sendEmail).toHaveBeenCalledWith(
        sendVerificationEmailArgs.email,
        'Verify Your Email',
        'verify-email',
        [
          { key: 'code', value: sendVerificationEmailArgs.code },
          { key: 'username', value: sendVerificationEmailArgs.email },
        ],
      );
    });
  });

  describe('sendEmail', () => {
    it('should send email', async () => {
      const ok = await service.sendEmail('', '', '', []);
      const formSpy = jest.spyOn(FormData.prototype, 'append');
      expect(formSpy).toHaveBeenCalledTimes(4);
      expect(got.post).toHaveBeenCalledTimes(1);
      expect(got.post).toHaveBeenCalledWith(
        `https://api.mailgun.net/v3/${TEST_DOMAIN}/messages`,
        expect.any(Object),
      );
      expect(ok).toEqual(true);
    });

    it('should append each email vars separately', async () => {
      const emailVar = [{ key: 'test-key', value: 'test-value' }];
      const varSpy = jest.spyOn(emailVar, 'forEach');
      await service.sendEmail('', '', '', emailVar);

      expect(varSpy).toHaveBeenCalledTimes(1);
    });

    it('should encode the API key using Buffer', async () => {
      const bufferSpy = jest.spyOn(Buffer, 'from');
      await service.sendEmail('', '', '', []);
      expect(bufferSpy).toHaveBeenCalledTimes(1);
      expect(bufferSpy).toHaveBeenCalledWith(`api:${TEST_APIKEY}`);
    });

    it('should fail on exception', async () => {
      jest.spyOn(got, 'post').mockImplementation(() => {
        throw error();
      });
      const ok = await service.sendEmail('', '', '', []);
      expect(ok).toEqual(false);
    });
  });
});
