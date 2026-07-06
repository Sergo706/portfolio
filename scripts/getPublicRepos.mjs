import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const res = await fetch('https://api.github.com/users/Sergo706/repos');
const reposData = await res.json();
const targetRepo = process.env.SYNC_REPO;
const repos = reposData.filter(r => !r.fork);

const targetDir = path.resolve(process.cwd(), 'repos');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const toSync = targetRepo && targetRepo !== 'all' ? repos.filter(r => r.name === targetRepo) : repos;

for (const repo of toSync) {
  const repoNameLower = repo.name.toLowerCase();
  const repoPath = path.join(targetDir, `${repoNameLower}.git`);
  console.log(`Fetching ${repo.name}...`);
  
  try {
    if (fs.existsSync(repoPath)) {
        console.log(`Updating ${repo.name}...`);
        execSync(`git fetch --all`, { cwd: repoPath, stdio: 'inherit' });
    } else {
        console.log(`Cloning ${repo.name}...`);
        execSync(`git clone --bare ${repo.clone_url} ${repoPath}`, { stdio: 'inherit' });
    }
    
    execSync(`git update-server-info`, { cwd: repoPath, stdio: 'inherit' });
    
    console.log(`Synced ${repo.name}\n`);
  } catch (error) {
    console.error(`Failed to sync ${repo.name}`);
  }
}
