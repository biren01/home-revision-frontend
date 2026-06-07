// backend/src/services/s3.js
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.NODE_ENV === 'development' ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined
});

const BUCKET_NAME = process.env.S3_BUCKET || 'family-question-bank-images';

class S3Service {
  // Generate pre-signed URL for direct upload from frontend
  async getUploadUrl(fileName, fileType, folder = 'questions') {
    const key = `${folder}/${uuidv4()}-${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    return {
      uploadUrl,
      fileUrl: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      key
    };
  }

  // Delete file from S3
  async deleteFile(key) {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    await s3Client.send(command);
    return { deleted: true, key };
  }

  // Get public URL for a file
  getPublicUrl(key) {
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }
}

export default new S3Service();