import type { CreativeFileRef, CreativeUploadInput, ID } from "@/domain";

export interface CreativeStorageRepository {
  createVersion(input: CreativeUploadInput): Promise<{ versionId: ID; file: CreativeFileRef }>;
  getFile(versionId: ID): Promise<CreativeFileRef | null>;
  deleteFile(versionId: ID): Promise<void>;
}
