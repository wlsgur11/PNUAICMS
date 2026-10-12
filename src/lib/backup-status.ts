/**
 * src/lib/backup-status.ts
 * ---------------------------------------------------------
 * 서버 백업과 복구 검증 결과. backup-db.sh, verify-backup.sh 가 남긴 한 줄짜리 파일을
 * 읽는다. 운영에서는 ~/cms-backups/status 가 /backup-status 로 읽기 전용으로 붙어 있다.
 *
 * 로그 파일에만 남으면 실패해도 아무도 모른다. 대시보드에 띄우려고 여기서 읽는다.
 */
import { readFile, stat } from 'fs/promises';
import path from 'path';

export type BackupRun = { ok: boolean; at: string; detail: string };
/** 폴더는 있는데 파일이 없으면 null. 한 번도 안 돈 것이라 화면에서 경고한다 */
export type BackupStatus = { backup: BackupRun | null; verify: BackupRun | null };

const DIR = process.env.BACKUP_STATUS_DIR || '/backup-status';

async function read(name: string): Promise<BackupRun | null> {
  try {
    const j = JSON.parse(await readFile(path.join(DIR, name), 'utf8'));
    if (typeof j?.ok !== 'boolean' || typeof j?.at !== 'string' || Number.isNaN(Date.parse(j.at))) return null;
    return { ok: j.ok, at: new Date(j.at).toISOString(), detail: typeof j.detail === 'string' ? j.detail : '' };
  } catch {
    return null;
  }
}

/** 폴더가 없으면(로컬 개발) null 이라 화면에 아무것도 안 띄운다 */
export async function loadBackupStatus(): Promise<BackupStatus | null> {
  try { await stat(DIR); } catch { return null; }
  const [backup, verify] = await Promise.all([read('backup.json'), read('verify.json')]);
  return { backup, verify };
}
