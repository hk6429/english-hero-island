import {
  classroomSupportScopeKey,
  type ClassroomSupportEvidenceStore,
  type ClassroomSupportScope,
} from "./ClassroomSupportEvidenceStore";

export class MemoryClassroomSupportEvidenceStore
  implements ClassroomSupportEvidenceStore
{
  private readonly markers = new Set<string>();

  async get(scope: ClassroomSupportScope): Promise<0 | 1> {
    return this.markers.has(classroomSupportScopeKey(scope)) ? 1 : 0;
  }

  async markTranscriptRevealed(scope: ClassroomSupportScope): Promise<void> {
    this.markers.add(classroomSupportScopeKey(scope));
  }

  async clear(scope: ClassroomSupportScope): Promise<void> {
    this.markers.delete(classroomSupportScopeKey(scope));
  }
}
