import { Test } from '@nestjs/testing';
import { MailService } from './mail.service';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import got from 'got';
import * as FormData from 'form-data';
import { error } from 'console';

jest.mock('got');
jest.mock('form-data');

const sendVerificationEmailArgs = {
  email: 'email',
  code: 'code',
};

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
      jest.spyOn(service, 'sendVerificationEmail');
      service.sendVerificationEmail(
        sendVerificationEmailArgs.email,
        sendVerificationEmailArgs.code,
      );
      expect(service.sendVerificationEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendEmail', () => {
    it('should send email', async () => {
      const ok = await service.sendVerificationEmail(
        sendVerificationEmailArgs.email,
        sendVerificationEmailArgs.code,
      );
      const formSpy = jest.spyOn(FormData.prototype, 'append');
      expect(formSpy).toHaveBeenCalledTimes(6);
      expect(got.post).toHaveBeenCalledTimes(1);
      expect(got.post).toHaveBeenCalledWith(
        `https://api.mailgun.net/v3/${TEST_DOMAIN}/messages`,
        expect.any(Object),
      );
      expect(ok).toEqual(true);
    });

    it('should encode the API key using Buffer', async () => {
      const bufferSpy = jest.spyOn(Buffer, 'from');
      await service.sendVerificationEmail(
        sendVerificationEmailArgs.email,
        sendVerificationEmailArgs.code,
      );
      expect(bufferSpy).toHaveBeenCalledTimes(1);
      expect(bufferSpy).toHaveBeenCalledWith(`api:${TEST_APIKEY}`);
    });

    it('should fail on exception', async () => {
      jest.spyOn(got, 'post').mockImplementation(() => {
        throw error();
      });
      const ok = await service.sendVerificationEmail(
        sendVerificationEmailArgs.email,
        sendVerificationEmailArgs.code,
      );
      expect(ok).toEqual(false);
    });
  });
});
