import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as AWS from 'aws-sdk';

@Controller('uploads')
export class UploadsController {
  @Post('')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    AWS.config.update({
      credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
      },
      region: process.env.AWS_S3_REGION,
    });
    try {
      const objectName = Date.now() + file.originalname;
      await new AWS.S3()
        .putObject({
          Body: file.buffer,
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: objectName,
        })
        .promise();
      const encodedFileName = encodeURIComponent(objectName);
      const url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${encodedFileName}`;
      return { url };
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}
