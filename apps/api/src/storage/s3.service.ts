import { Injectable, Logger } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrlBase: string;

  constructor() {
    const endpoint = requireEnv('SUPABASE_S3_ENDPOINT');
    const region = requireEnv('SUPABASE_S3_REGION');
    const accessKeyId = requireEnv('SUPABASE_S3_ACCESS_KEY_ID');
    const secretAccessKey = requireEnv('SUPABASE_S3_SECRET_ACCESS_KEY');
    this.bucket = requireEnv('SUPABASE_STORAGE_BUCKET');
    this.publicUrlBase = requireEnv('SUPABASE_STORAGE_PUBLIC_URL').replace(
      /\/+$/,
      '',
    );

    this.client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }

  async upload(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    const url = `${this.publicUrlBase}/${encodeURI(key)}`;
    this.logger.log(`Uploaded ${key} (${body.byteLength} bytes)`);
    return url;
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}
