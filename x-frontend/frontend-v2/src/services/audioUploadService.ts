/**
 * Audio Upload Service - Direct S3 Upload
 * Handles presigned URL generation and direct-to-S3 uploads
 * 
 * Benefits:
 * - 33% smaller transfer (no base64 encoding)
 * - No server bandwidth usage
 * - Faster uploads
 * - Better error handling
 */

import axios from 'axios';

export interface PresignedUrlResponse {
  success: boolean;
  upload_url: string;
  s3_key: string;
  expires_in: number;
  max_file_size_mb: number;
  allowed_content_type: string;
}

export interface UploadResult {
  success: boolean;
  s3_key: string;
  duration: number;
  format: string;
  file_size: number;
}

export class AudioUploadService {
  /**
   * Upload audio file directly to S3 using presigned URL
   * 
   * @param sessionId - Session identifier
   * @param questionId - Question identifier
   * @param audioBlob - Audio file as Blob
   * @param duration - Audio duration in seconds
   * @param format - Audio format (mp3/mp4)
   * @returns Upload result with S3 key
   */
  static async uploadAudio(
    sessionId: string,
    questionId: string,
    audioBlob: Blob,
    duration: number,
    format: string
  ): Promise<UploadResult> {
    try {
      // Step 1: Get presigned URL from backend
      const token = localStorage.getItem('authToken');
      const presignedResponse = await axios.post<PresignedUrlResponse>(
        `/api/sessions/${sessionId}/speaking/upload-url`,
        null, // No body needed
        {
          params: {
            question_id: questionId,
            audio_format: format,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!presignedResponse.data.success) {
        throw new Error('Failed to generate upload URL');
      }

      const { upload_url, s3_key, max_file_size_mb, allowed_content_type } = presignedResponse.data;

      // Validate file size
      const fileSizeMB = audioBlob.size / (1024 * 1024);
      if (fileSizeMB > max_file_size_mb) {
        throw new Error(
          `File size ${fileSizeMB.toFixed(2)}MB exceeds maximum ${max_file_size_mb}MB`
        );
      }

      // Step 2: Upload directly to S3
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        body: audioBlob,
        headers: {
          'Content-Type': allowed_content_type,
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('S3 upload error:', errorText);
        throw new Error(
          `S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`
        );
      }

      return {
        success: true,
        s3_key,
        duration,
        format,
        file_size: audioBlob.size,
      };
    } catch (error) {
      console.error('❌ Audio upload failed:', error);
      throw error;
    }
  }

  /**
   * Validate audio blob before upload
   */
  static validateAudioBlob(blob: Blob, maxSizeMB: number = 10): void {
    if (!blob || blob.size === 0) {
      throw new Error('Audio blob is empty');
    }

    const sizeMB = blob.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      throw new Error(`File size ${sizeMB.toFixed(2)}MB exceeds maximum ${maxSizeMB}MB`);
    }

    // Validate MIME type
    const validTypes = ['audio/mp4', 'audio/mpeg', 'audio/webm'];
    if (!validTypes.includes(blob.type)) {
      console.warn('⚠️  Unexpected MIME type:', blob.type);
    }
  }

  /**
   * Get audio format from blob
   */
  static getAudioFormat(blob: Blob): string {
    if (blob.type.includes('mp4')) return 'mp4';
    if (blob.type.includes('mpeg') || blob.type.includes('mp3')) return 'mp3';
    if (blob.type.includes('webm')) return 'webm';
    
    // Default to mp4 if unknown
    return 'mp4';
  }
}

export default AudioUploadService;
