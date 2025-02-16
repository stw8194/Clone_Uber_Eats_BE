import { Test } from '@nestjs/testing';
import { MailService } from './mail.service';
import { CONFIG_OPTIONS } from 'src/common/common.constants';

jest.mock('got', () => {});
jest.mock('form-data', () => {
  return {
    append: jest.fn(),
  };
});

describe('MailService', () => {
  let service: MailService;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: CONFIG_OPTIONS,
          useValue: {
            apiKey: 'test-API_KEY',
            domain: 'test-DOMAIN',
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
  it.todo('sendEmail');
  it.todo('sendVerificationEmail');
});
