import LightningFS from '@isomorphic-git/lightning-fs';
import type { Results } from '@riavzon/utils';

export type LightningFSPromises = InstanceType<typeof LightningFS>['promises'];

export async function fetchGitFile(
  repoUrl: string,
  subPath: string,
): Promise<Results<Uint8Array>> {
  const res = await fetch(`${repoUrl}/${subPath}`);

  if (!res.ok) {
    if (res.status === 404) {
      return {
         ok: false,
         date: new Date().toISOString(),
         reason: `Path doesn't exists`
      };
    }
    return {
      ok: false,
      date: new Date().toISOString(),
      reason: `Failed to fetch ${subPath}: ${String(res.status)}`
    };
  }
  return {
    ok: true,
    date: new Date().toISOString(),
    data: new Uint8Array(await res.arrayBuffer())
  };
}


export async function wipeDir(
  pfs: LightningFSPromises,
  dirPath: string,
) {
  const entries: string[] = await pfs.readdir(dirPath).catch(() => []);

  for (const entry of entries) {
    const full = `${dirPath}/${entry}`;
    const stat = await pfs.stat(full).catch(() => null);

    if (!stat) continue;

    if (stat.isDirectory()) {
      await wipeDir(pfs, full);
      await pfs.rmdir(full).catch(() => { /* empty */ });
    } else {
      await pfs.unlink(full).catch(() => { /* empty */ });
    }
  }
  await pfs.rmdir(dirPath).catch(() => { /* empty */ });
}

export async function mkdirp(
  pfs: LightningFSPromises,
  base: string,
  subPath: string,
) {
  const parts = subPath.split('/');
  let curr = base;
  for (const p of parts) {
    curr = `${curr}/${p}`;
    await pfs.mkdir(curr).catch(() => { /* empty */ });
  }
}

export async function syncBareRepo(
  pfs: LightningFSPromises,
  repoUrl: string,
  dir: string,
): Promise<Results<void>> {

  await pfs.mkdir(dir).catch(() => { /* empty */ });
  await mkdirp(pfs, dir, '.git/refs/heads');
  await mkdirp(pfs, dir, '.git/refs/tags');
  await mkdirp(pfs, dir, '.git/info');
  await mkdirp(pfs, dir, '.git/objects/info');
  await mkdirp(pfs, dir, '.git/objects/pack');

  const cleanupAndReturn = async (reason: string): Promise<Results<void>> => {
    await wipeDir(pfs, dir);
    return { 
      ok: false,
      reason, 
      date: new Date().toISOString() 
    };
  };

  const head = await fetchGitFile(repoUrl, 'HEAD');
  if (!head.ok) return cleanupAndReturn(head.reason);
  await pfs.writeFile(`${dir}/.git/HEAD`, head.data);

  const config = await fetchGitFile(repoUrl, 'config');
  if (config.ok) {
    await pfs.writeFile(`${dir}/.git/config`, config.data);
  } else {
    await pfs.writeFile(
      `${dir}/.git/config`,
      new TextEncoder().encode('[core]\n\trepositoryformatversion = 0\n\tbare = false\n'),
    );
  }

  const packedRefs = await fetchGitFile(repoUrl, 'packed-refs');
  if (packedRefs.ok) await pfs.writeFile(`${dir}/.git/packed-refs`, packedRefs.data);

  const infoRefs = await fetchGitFile(repoUrl, 'info/refs');
  if (infoRefs.ok) await pfs.writeFile(`${dir}/.git/info/refs`, infoRefs.data);

  // discover which packfiles exist
  const packsRaw = await fetchGitFile(repoUrl, 'objects/info/packs');
  if (!packsRaw.ok) return cleanupAndReturn(packsRaw.reason);

  await pfs.writeFile(`${dir}/.git/objects/info/packs`, packsRaw.data);

  const packsText = new TextDecoder().decode(packsRaw.data);
  for (const line of packsText.split('\n')) {
    if (!line.startsWith('P ')) continue;
    const packName = line.substring(2).trim();
    if (!packName) continue;
    const idxName = packName.replace('.pack', '.idx');

    // download .idx pack index  used to locate objects by OID
    const idxData = await fetchGitFile(repoUrl, `objects/pack/${idxName}`);
    if (!idxData.ok) return cleanupAndReturn(idxData.reason);
    await pfs.writeFile(`${dir}/.git/objects/pack/${idxName}`, idxData.data);

    // download .pack the actual object data
    const packData = await fetchGitFile(repoUrl, `objects/pack/${packName}`);
    if (!packData.ok) return cleanupAndReturn(packData.reason);
    await pfs.writeFile(`${dir}/.git/objects/pack/${packName}`, packData.data);
  }

  // everything downloaded successfully, write the marker
  await pfs.writeFile(`${dir}/.cloned`, new Uint8Array());
  return { ok: true, data: undefined, date: new Date().toISOString() };
}

export async function updateBareRepo(
  pfs: LightningFSPromises,
  repoUrl: string,
  dir: string,
): Promise<Results<boolean>> {
  let downloadedSomething = false;

  const head = await fetchGitFile(repoUrl, 'HEAD');
  if (!head.ok) return { ok: false, reason: head.reason, date: new Date().toISOString() };
  await pfs.writeFile(`${dir}/.git/HEAD`, head.data);

  const packedRefs = await fetchGitFile(repoUrl, 'packed-refs');
  if (packedRefs.ok) await pfs.writeFile(`${dir}/.git/packed-refs`, packedRefs.data);

  const infoRefs = await fetchGitFile(repoUrl, 'info/refs');
  if (infoRefs.ok) await pfs.writeFile(`${dir}/.git/info/refs`, infoRefs.data);

  const packsRaw = await fetchGitFile(repoUrl, 'objects/info/packs');
  if (!packsRaw.ok) return { ok: false, reason: packsRaw.reason, date: new Date().toISOString() };
  
  await pfs.writeFile(`${dir}/.git/objects/info/packs`, packsRaw.data);

  const packsText = new TextDecoder().decode(packsRaw.data);
  for (const line of packsText.split('\n')) {
    if (!line.startsWith('P ')) continue;
    const packName = line.substring(2).trim();
    if (!packName) continue;

    const packExists = await pfs.stat(`${dir}/.git/objects/pack/${packName}`).catch(() => null);
    
    if (!packExists) {
      const idxName = packName.replace('.pack', '.idx');
      
      const idxData = await fetchGitFile(repoUrl, `objects/pack/${idxName}`);
      if (idxData.ok) await pfs.writeFile(`${dir}/.git/objects/pack/${idxName}`, idxData.data);

      const packData = await fetchGitFile(repoUrl, `objects/pack/${packName}`);
      if (packData.ok) await pfs.writeFile(`${dir}/.git/objects/pack/${packName}`, packData.data);
      
      downloadedSomething = true;
    }
  }

  return { ok: true, data: downloadedSomething, date: new Date().toISOString() };
}