import { CHUNK_SIZE } from './protocol';

export interface FileMetadata {
  filename: string;
  size: number;
  checksum: string;
  total_chunks: number;
}

export interface FileChunk {
  sequence_number: number;
  total_chunks: number;
  payload: Uint8Array;
}

export function createFileMetadata(filename: string, bytes: Uint8Array, checksum: string): FileMetadata {
  return { filename, size: bytes.byteLength, checksum, total_chunks: Math.max(1, Math.ceil(bytes.byteLength / CHUNK_SIZE)) };
}

export function chunkFile(bytes: Uint8Array, chunkSize = CHUNK_SIZE): FileChunk[] {
  const total = Math.max(1, Math.ceil(bytes.byteLength / chunkSize));
  return Array.from({ length: total }, (_, sequence_number) => ({
    sequence_number,
    total_chunks: total,
    payload: bytes.slice(sequence_number * chunkSize, Math.min(bytes.byteLength, (sequence_number + 1) * chunkSize)),
  }));
}

export function reassembleFile(chunks: FileChunk[]): Uint8Array {
  const ordered = [...chunks].sort((a, b) => a.sequence_number - b.sequence_number);
  if (ordered.length === 0 || ordered.some((chunk, index) => chunk.sequence_number !== index)) throw new Error('File chunks are incomplete.');
  const totalSize = ordered.reduce((sum, chunk) => sum + chunk.payload.byteLength, 0);
  const result = new Uint8Array(totalSize);
  let offset = 0;
  ordered.forEach((chunk) => { result.set(chunk.payload, offset); offset += chunk.payload.byteLength; });
  return result;
}
