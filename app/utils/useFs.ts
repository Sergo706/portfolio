import LightningFS from '@isomorphic-git/lightning-fs';

export type LightningFSPromises = InstanceType<typeof LightningFS>['promises'];

export async function fetchGitFile(
  repoUrl: string,
  subPath: string,
): Promise<Uint8Array | null> {
  const res = await fetch(`${repoUrl}/${subPath}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch ${subPath}: ${String(res.status)}`);
  }
  return new Uint8Array(await res.arrayBuffer());
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
) {

  await pfs.mkdir(dir).catch(() => { /* empty */ });
  await mkdirp(pfs, dir, '.git/refs/heads');
  await mkdirp(pfs, dir, '.git/refs/tags');
  await mkdirp(pfs, dir, '.git/info');
  await mkdirp(pfs, dir, '.git/objects/info');
  await mkdirp(pfs, dir, '.git/objects/pack');

  const head = await fetchGitFile(repoUrl, 'HEAD');
  if (!head) throw new Error('Repository has no HEAD file');
  await pfs.writeFile(`${dir}/.git/HEAD`, head);

  const config = await fetchGitFile(repoUrl, 'config');
  if (config) {
    await pfs.writeFile(`${dir}/.git/config`, config);
  } else {
    await pfs.writeFile(
      `${dir}/.git/config`,
      new TextEncoder().encode('[core]\n\trepositoryformatversion = 0\n\tbare = false\n'),
    );
  }


const packedRefs = await fetchGitFile(repoUrl, 'packed-refs');
  if (packedRefs) await pfs.writeFile(`${dir}/.git/packed-refs`, packedRefs);


  const infoRefs = await fetchGitFile(repoUrl, 'info/refs');
  if (infoRefs) await pfs.writeFile(`${dir}/.git/info/refs`, infoRefs);

  // discover which packfiles exist
  const packsRaw = await fetchGitFile(repoUrl, 'objects/info/packs');
  if (!packsRaw) throw new Error('Repository has no objects/info/packs file');

  await pfs.writeFile(`${dir}/.git/objects/info/packs`, packsRaw);

  const packsText = new TextDecoder().decode(packsRaw);
  for (const line of packsText.split('\n')) {
    if (!line.startsWith('P ')) continue;
    const packName = line.substring(2).trim();
    if (!packName) continue;
    const idxName = packName.replace('.pack', '.idx');

    // download .idx pack index  used to locate objects by OID
    const idxData = await fetchGitFile(repoUrl, `objects/pack/${idxName}`);
    if (!idxData) throw new Error(`Missing pack index: ${idxName}`);
    await pfs.writeFile(`${dir}/.git/objects/pack/${idxName}`, idxData);

    // download .pack the actual object data
    const packData = await fetchGitFile(repoUrl, `objects/pack/${packName}`);
    if (!packData) throw new Error(`Missing pack file: ${packName}`);
    await pfs.writeFile(`${dir}/.git/objects/pack/${packName}`, packData);
  }

  // everything downloaded successfully, write the marker
  await pfs.writeFile(`${dir}/.cloned`, new Uint8Array());
}



export async function updateBareRepo(
  pfs: LightningFSPromises,
  repoUrl: string,
  dir: string,
): Promise<boolean> {
  let downloadedSomething = false;

  const head = await fetchGitFile(repoUrl, 'HEAD');
  if (head) await pfs.writeFile(`${dir}/.git/HEAD`, head);

  const packedRefs = await fetchGitFile(repoUrl, 'packed-refs');
  if (packedRefs) await pfs.writeFile(`${dir}/.git/packed-refs`, packedRefs);

  const infoRefs = await fetchGitFile(repoUrl, 'info/refs');
  if (infoRefs) await pfs.writeFile(`${dir}/.git/info/refs`, infoRefs);


  const packsRaw = await fetchGitFile(repoUrl, 'objects/info/packs');
  if (!packsRaw) return false;
  
  await pfs.writeFile(`${dir}/.git/objects/info/packs`, packsRaw);


  const packsText = new TextDecoder().decode(packsRaw);
  for (const line of packsText.split('\n')) {
    if (!line.startsWith('P ')) continue;
    const packName = line.substring(2).trim();
    if (!packName) continue;

    const packExists = await pfs.stat(`${dir}/.git/objects/pack/${packName}`).catch(() => null);
    
    if (!packExists) {
      const idxName = packName.replace('.pack', '.idx');
      
      const idxData = await fetchGitFile(repoUrl, `objects/pack/${idxName}`);
      if (idxData) await pfs.writeFile(`${dir}/.git/objects/pack/${idxName}`, idxData);

      const packData = await fetchGitFile(repoUrl, `objects/pack/${packName}`);
      if (packData) await pfs.writeFile(`${dir}/.git/objects/pack/${packName}`, packData);
      
      downloadedSomething = true;
    }
  }

  return downloadedSomething;
}