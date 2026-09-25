#!/usr/bin/env node
/**
 * Global Obsidian story sync — works across repos.
 *
 *   obsidian-sync enable [--project name] [--create-folders]
 *   obsidian-sync disable
 *   obsidian-sync start --ticket KEY-123 --title "Title"
 *   obsidian-sync commit [--all] [--hash HEAD]
 *   obsidian-sync find --ticket KEY-123
 *   obsidian-sync status
 *   obsidian-sync projects
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOL_ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(TOOL_ROOT, 'config.json');
const ENV_PATH = path.join(TOOL_ROOT, 'env');
const HOOK_SOURCE = path.join(TOOL_ROOT, 'hooks', 'post-commit');
const BINDING_FILE = '.obsidian-sync.json';

function loadEnvFile() {
  const envFile = process.env.OBSIDIAN_STORY_ENV
    ? path.resolve(process.env.OBSIDIAN_STORY_ENV)
    : ENV_PATH;
  if (!fs.existsSync(envFile)) return;

  const content = fs.readFileSync(envFile, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const cleaned = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eq = cleaned.indexOf('=');
    if (eq <= 0) continue;
    const key = cleaned.slice(0, eq).trim();
    let value = cleaned.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Do not override variables already set in the process environment
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

function loadRawConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Missing config: ${CONFIG_PATH}`);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function saveRawConfig(config) {
  fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function run(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts,
  }).trim();
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i += 1;
      }
    } else {
      args._.push(token);
    }
  }
  return args;
}

function resolveCwd(args) {
  if (args.cwd) return path.resolve(String(args.cwd));
  return process.cwd();
}

function getGitRoot(cwd) {
  try {
    return run('git rev-parse --show-toplevel', { cwd });
  } catch {
    return null;
  }
}

function getGitBranch(cwd) {
  try {
    return run('git rev-parse --abbrev-ref HEAD', { cwd });
  } catch {
    return null;
  }
}

function getGitRemotes(cwd) {
  try {
    return run('git remote -v', { cwd });
  } catch {
    return '';
  }
}

function readBinding(gitRoot) {
  if (!gitRoot) return null;
  const file = path.join(gitRoot, BINDING_FILE);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeBinding(gitRoot, data) {
  const file = path.join(gitRoot, BINDING_FILE);
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  ensureGitignore(gitRoot, BINDING_FILE);
}

function ensureGitignore(gitRoot, entry) {
  const gi = path.join(gitRoot, '.gitignore');
  if (!fs.existsSync(gi)) {
    fs.writeFileSync(gi, `${entry}\n`, 'utf8');
    return;
  }
  const current = fs.readFileSync(gi, 'utf8');
  if (current.split(/\r?\n/).some((line) => line.trim() === entry)) return;
  const suffix = current.endsWith('\n') ? '' : '\n';
  fs.appendFileSync(gi, `${suffix}\n# Local Obsidian story sync binding\n${entry}\n`, 'utf8');
}

function env(name) {
  const value = process.env[name];
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed === '' ? undefined : trimmed;
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function parseSearchFolders(value) {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Precedence (highest → lowest):
 * 1. CLI flags (--vault, --root, --jira-base, --ticket-pattern, --in-progress-folder, --search-folders)
 * 2. Environment variables (OBSIDIAN_*)
 * 3. Project config in config.json
 * 4. defaults in config.json
 */
function resolveOverrides(args = {}) {
  return {
    vaultPath: firstDefined(args.vault, env('OBSIDIAN_VAULT_PATH')),
    projectRoot: firstDefined(args.root, env('OBSIDIAN_PROJECT_ROOT')),
    inProgressFolder: firstDefined(args['in-progress-folder'], env('OBSIDIAN_IN_PROGRESS_FOLDER')),
    searchFolders: parseSearchFolders(firstDefined(args['search-folders'], env('OBSIDIAN_SEARCH_FOLDERS'))),
    ticketPattern: firstDefined(args['ticket-pattern'], env('OBSIDIAN_TICKET_PATTERN')),
    jiraBaseUrl: firstDefined(args['jira-base'], env('OBSIDIAN_JIRA_BASE_URL')),
  };
}

function matchProject(raw, cwd, gitRoot) {
  const binding = readBinding(gitRoot);
  if (binding?.project && raw.projects?.[binding.project]) {
    return { name: binding.project, project: raw.projects[binding.project], source: 'binding' };
  }

  const remotes = getGitRemotes(cwd);
  const absCwd = path.resolve(cwd);

  for (const [name, project] of Object.entries(raw.projects || {})) {
    const match = project.match || {};
    for (const p of match.paths || []) {
      if (absCwd.startsWith(path.resolve(p))) {
        return { name, project, source: 'path' };
      }
    }
    for (const remoteNeedle of match.remotes || []) {
      if (remotes.includes(remoteNeedle)) {
        return { name, project, source: 'remote' };
      }
    }
  }

  return null;
}

function mergeProjectConfig(raw, matched, args = {}) {
  const defaults = raw.defaults || {};
  const project = matched?.project || {};
  const overrides = resolveOverrides(args);

  const vaultPath = firstDefined(overrides.vaultPath, raw.vaultPath);
  if (!vaultPath) {
    throw new Error(
      'Missing vault path. Set OBSIDIAN_VAULT_PATH, pass --vault, or set vaultPath in ~/.obsidian-story-sync/config.json',
    );
  }

  return {
    vaultPath: path.resolve(String(vaultPath)),
    projectName: matched?.name || null,
    projectRoot: firstDefined(overrides.projectRoot, project.projectRoot, matched?.name),
    inProgressFolder: firstDefined(
      overrides.inProgressFolder,
      project.inProgressFolder,
      defaults.inProgressFolder,
      'In Progress',
    ),
    searchFolders:
      overrides.searchFolders ||
      project.searchFolders ||
      defaults.searchFolders ||
      ['In Progress'],
    ticketPattern: firstDefined(
      overrides.ticketPattern,
      project.ticketPattern,
      defaults.ticketPattern,
      '[A-Z][A-Z0-9]+-\\d+',
    ),
    jiraBaseUrl: firstDefined(overrides.jiraBaseUrl, project.jiraBaseUrl, defaults.jiraBaseUrl, ''),
    overrides,
  };
}

function resolveConfig(raw, args) {
  const cwd = resolveCwd(args);
  const gitRoot = getGitRoot(cwd);
  let matched = null;

  if (args.project) {
    const name = String(args.project);
    if (!raw.projects?.[name]) {
      throw new Error(`Unknown project "${name}". Run: obsidian-sync projects`);
    }
    matched = { name, project: raw.projects[name], source: 'flag' };
  } else {
    matched = matchProject(raw, cwd, gitRoot);
  }

  if (!matched) {
    throw new Error(
      'No Obsidian project mapped for this repo. Run: obsidian-sync enable --project <name> [--create-folders]',
    );
  }

  return {
    ...mergeProjectConfig(raw, matched, args),
    cwd,
    gitRoot,
    matchSource: matched.source,
  };
}

function ticketRegex(config) {
  return new RegExp(config.ticketPattern, 'i');
}

function extractTicket(text, config) {
  if (!text) return null;
  const match = text.match(ticketRegex(config));
  return match ? match[0].toUpperCase() : null;
}

function projectPath(config, folder) {
  return path.join(config.vaultPath, config.projectRoot, folder);
}

function listStoryFiles(config) {
  const files = [];
  for (const folder of config.searchFolders) {
    const dir = projectPath(config, folder);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.md') || name === 'TODO.md') continue;
      files.push({ folder, name, path: path.join(dir, name) });
    }
  }
  return files;
}

function findStoryByTicket(config, ticket) {
  const needle = ticket.toUpperCase();
  return listStoryFiles(config).find((file) => file.name.toUpperCase().includes(needle)) ?? null;
}

function formatFilenameDate(date = new Date()) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}.${dd}`;
}

function formatHumanDate(date = new Date()) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function sanitizeTitle(title) {
  return title
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildInitialContent({ ticket, branch, startedAt, jiraBaseUrl }) {
  const link = jiraBaseUrl ? `${jiraBaseUrl}/${ticket}` : ticket;
  return [
    link,
    '',
    `Branch name: \`${branch}\``,
    `Started at: ${startedAt}`,
    'PR:',
    'PR created at:',
    'PR merged at:',
    'Merge commit:',
    '___',
    '### Other Commits',
    '',
  ].join('\n');
}

function ensureOtherCommitsSection(content) {
  if (/###\s*Other Commits/i.test(content)) return content;
  return `${content.replace(/\s*$/, '')}\n\n### Other Commits\n`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function appendCommitEntry(content, { dateHeading, lines }) {
  let next = ensureOtherCommitsSection(content);
  const otherIdx = next.search(/###\s*Other Commits/i);
  const before = next.slice(0, otherIdx);
  let after = next.slice(otherIdx);
  const block = lines.join('\n');
  const headingPattern = new RegExp(`^####\\s+${escapeRegExp(dateHeading)}\\s*$`, 'm');

  if (headingPattern.test(after)) {
    const sectionStart = after.search(headingPattern);
    const rest = after.slice(sectionStart);
    const nextHeadingRel = rest.slice(1).search(/^####\s+/m);
    const sectionEnd = nextHeadingRel === -1 ? after.length : sectionStart + 1 + nextHeadingRel;
    const section = after.slice(sectionStart, sectionEnd);
    const hasCommits = /Commit:\s*`/.test(section);
    const separator = hasCommits ? '\n\n' : '\n';
    const updatedSection = `${section.replace(/\s*$/, '')}${separator}${block}\n`;
    after = after.slice(0, sectionStart) + updatedSection + after.slice(sectionEnd);
  } else {
    const insert = `\n#### ${dateHeading}\n${block}\n`;
    after = after.replace(/###\s*Other Commits\s*/i, (match) => `${match}${insert}`);
  }

  return `${before}${after}`.replace(/\n{3,}/g, '\n\n');
}

function getCommitInfo(cwd, hash = 'HEAD') {
  const raw = run(`git log -1 --format=%H%n%h%n%cI%n%s ${hash}`, { cwd });
  const [full, short, iso, subject] = raw.split('\n');
  if (!full || !short || !iso || !subject) {
    throw new Error(`Could not read commit info for ${hash}`);
  }
  return { full, short, date: new Date(iso), subject };
}

function resolveMergeBase(cwd) {
  const candidates = ['origin/dev', 'dev', 'origin/main', 'main', 'origin/master', 'master'];
  for (const candidate of candidates) {
    try {
      return run(`git merge-base HEAD ${candidate}`, { cwd });
    } catch {
      // try next
    }
  }
  return null;
}

function getBranchCommitsSinceBase(cwd) {
  const base = resolveMergeBase(cwd);
  if (!base) return [getCommitInfo(cwd, 'HEAD')];
  const hashes = run(`git log --reverse --format=%H ${base}..HEAD`, { cwd })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (hashes.length === 0) return [getCommitInfo(cwd, 'HEAD')];
  return hashes.map((hash) => getCommitInfo(cwd, hash));
}

function isCommitLogged(content, commit) {
  return content.includes(commit.full) || content.includes(`\`${commit.short}\``);
}

function logCommitToStory(storyPath, commit, branch) {
  const current = fs.readFileSync(storyPath, 'utf8');
  if (isCommitLogged(current, commit)) return false;
  const dateHeading = formatHumanDate(commit.date);
  const lines = [
    `Commit: \`${commit.short}\` (\`${commit.full}\`)`,
    `Branch: \`${branch}\``,
    `- ${commit.subject}`,
  ];
  fs.writeFileSync(storyPath, appendCommitEntry(current, { dateHeading, lines }), 'utf8');
  return true;
}

function ensureProjectFolders(config, create) {
  const root = path.join(config.vaultPath, config.projectRoot);
  if (!fs.existsSync(root)) {
    if (!create) {
      throw new Error(
        `Vault folder missing: ${root}\nPass --create-folders to create "${config.projectRoot}" + workflow folders.`,
      );
    }
    fs.mkdirSync(root, { recursive: true });
  }
  for (const folder of config.searchFolders) {
    const dir = projectPath(config, folder);
    if (!fs.existsSync(dir) && create) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function cmdProjects(raw, args = {}) {
  const overrides = resolveOverrides(args);
  const vaultPath = firstDefined(overrides.vaultPath, raw.vaultPath) || '(missing)';
  console.log(`Vault: ${vaultPath}${overrides.vaultPath ? ' (env/flag)' : ' (config.json)'}`);
  console.log('Projects:');
  for (const [name, project] of Object.entries(raw.projects || {})) {
    console.log(`- ${name}`);
    console.log(`    root: ${firstDefined(overrides.projectRoot, project.projectRoot, name)}`);
    console.log(
      `    ticket: ${firstDefined(overrides.ticketPattern, project.ticketPattern, raw.defaults?.ticketPattern)}`,
    );
    if (project.match?.paths?.length) console.log(`    paths: ${project.match.paths.join(', ')}`);
    if (project.match?.remotes?.length) console.log(`    remotes: ${project.match.remotes.join(', ')}`);
  }
}

function cmdEnable(raw, args) {
  const cwd = resolveCwd(args);
  const gitRoot = getGitRoot(cwd);
  if (!gitRoot) throw new Error('Not inside a git repository.');

  let projectName = args.project ? String(args.project) : null;
  if (!projectName) {
    const matched = matchProject(raw, cwd, gitRoot);
    projectName = matched?.name || null;
  }
  if (!projectName) {
    throw new Error('Pass --project <name> (see: obsidian-sync projects).');
  }

  if (!raw.projects?.[projectName]) {
    // register a new project on the fly
    const projectRoot = args.root ? String(args.root) : projectName;
    raw.projects = raw.projects || {};
    raw.projects[projectName] = {
      projectRoot,
      ticketPattern: args['ticket-pattern']
        ? String(args['ticket-pattern'])
        : raw.defaults?.ticketPattern,
      jiraBaseUrl: args['jira-base'] ? String(args['jira-base']) : raw.defaults?.jiraBaseUrl,
      match: {
        paths: [gitRoot.endsWith(path.sep) ? gitRoot : `${gitRoot}${path.sep}`],
      },
    };
    saveRawConfig(raw);
    console.log(`REGISTERED\tproject=${projectName}\troot=${projectRoot}`);
  } else {
    // ensure path match includes this repo
    const project = raw.projects[projectName];
    project.match = project.match || {};
    project.match.paths = project.match.paths || [];
    const needle = gitRoot.endsWith(path.sep) ? gitRoot : `${gitRoot}${path.sep}`;
    if (!project.match.paths.some((p) => path.resolve(p) === path.resolve(needle) || path.resolve(p) === path.resolve(gitRoot))) {
      project.match.paths.push(needle);
      saveRawConfig(raw);
    }
  }

  const config = mergeProjectConfig(raw, { name: projectName, project: raw.projects[projectName] }, args);
  ensureProjectFolders(config, Boolean(args['create-folders']));

  writeBinding(gitRoot, {
    project: projectName,
    enabledAt: new Date().toISOString(),
  });

  const hookDest = path.join(gitRoot, '.git', 'hooks', 'post-commit');
  fs.copyFileSync(HOOK_SOURCE, hookDest);
  fs.chmodSync(hookDest, 0o755);

  console.log(`ENABLED\tproject=${projectName}`);
  console.log(`HOOK\t${hookDest}`);
  console.log(`BINDING\t${path.join(gitRoot, BINDING_FILE)} (gitignored)`);
  console.log(`VAULT\t${path.join(config.vaultPath, config.projectRoot)}`);
  if (config.overrides?.vaultPath) {
    console.log('NOTE\tVault path came from --vault or OBSIDIAN_VAULT_PATH');
  }
}

function cmdDisable(args) {
  const cwd = resolveCwd(args);
  const gitRoot = getGitRoot(cwd);
  if (!gitRoot) throw new Error('Not inside a git repository.');

  const binding = path.join(gitRoot, BINDING_FILE);
  if (fs.existsSync(binding)) fs.unlinkSync(binding);

  const hookDest = path.join(gitRoot, '.git', 'hooks', 'post-commit');
  if (fs.existsSync(hookDest)) {
    const content = fs.readFileSync(hookDest, 'utf8');
    if (content.includes('obsidian-sync') || content.includes('OBSIDIAN_STORY_SYNC')) {
      fs.unlinkSync(hookDest);
      console.log(`REMOVED\t${hookDest}`);
    } else {
      console.log(`SKIP\tExisting post-commit hook left untouched: ${hookDest}`);
    }
  }

  console.log(`DISABLED\t${gitRoot}`);
}

function cmdStart(config, args) {
  const ticket =
    (args.ticket ? String(args.ticket).toUpperCase() : null) ||
    extractTicket(args.title, config) ||
    extractTicket(getGitBranch(config.cwd), config);

  if (!ticket) {
    throw new Error('Missing ticket. Pass --ticket KEY-123 (or include it in --title / branch).');
  }

  const existing = findStoryByTicket(config, ticket);
  if (existing) {
    console.log(`EXISTS\t${existing.path}`);
    return existing.path;
  }

  if (!args.title) {
    throw new Error('Missing --title. Needed to create a new Obsidian note.');
  }

  ensureProjectFolders(config, false);

  const title = sanitizeTitle(String(args.title));
  const branch = args.branch ? String(args.branch) : getGitBranch(config.cwd) || `feat/${ticket}`;
  const now = new Date();
  const filename = `${formatFilenameDate(now)} - ${ticket} - ${title}.md`;
  const dir = projectPath(config, config.inProgressFolder);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);

  fs.writeFileSync(
    filePath,
    buildInitialContent({
      ticket,
      branch,
      startedAt: formatHumanDate(now),
      jiraBaseUrl: config.jiraBaseUrl,
    }),
    'utf8',
  );
  console.log(`CREATED\t${filePath}`);
  return filePath;
}

function cmdCommit(config, args) {
  const branch = getGitBranch(config.cwd) || '';
  const ticket =
    (args.ticket ? String(args.ticket).toUpperCase() : null) ||
    extractTicket(branch, config) ||
    extractTicket(getCommitInfo(config.cwd, args.hash || 'HEAD').subject, config);

  if (!ticket) {
    console.log('SKIP\tNo ticket found in branch or commit message.');
    return null;
  }

  let story = findStoryByTicket(config, ticket);
  if (!story) {
    if (!args.title) {
      console.log(
        `SKIP\tNo Obsidian note for ${ticket}. Run: obsidian-sync start --ticket ${ticket} --title "..."`,
      );
      return null;
    }
    cmdStart(config, { ticket, title: args.title, branch });
    story = findStoryByTicket(config, ticket);
  }

  if (!story) throw new Error(`Could not find/create note for ${ticket}`);

  const commits = args.all
    ? getBranchCommitsSinceBase(config.cwd)
    : [getCommitInfo(config.cwd, args.hash || 'HEAD')];

  let added = 0;
  let skipped = 0;
  for (const commit of commits) {
    if (logCommitToStory(story.path, commit, branch)) {
      added += 1;
      console.log(`ADDED\t${commit.short}\t${commit.subject}`);
    } else {
      skipped += 1;
      console.log(`SKIP\t${commit.short}\talready logged`);
    }
  }

  console.log(`DONE\t${story.path}\tadded=${added}\tskipped=${skipped}`);
  return story.path;
}

function cmdFind(config, args) {
  const ticket =
    (args.ticket ? String(args.ticket).toUpperCase() : null) ||
    extractTicket(getGitBranch(config.cwd), config);

  if (!ticket) throw new Error('Missing --ticket');

  const story = findStoryByTicket(config, ticket);
  if (!story) {
    console.log(`NOT_FOUND\t${ticket}`);
    process.exitCode = 1;
    return null;
  }
  console.log(`FOUND\t${story.path}`);
  return story.path;
}

function cmdStatus(config) {
  const vaultSource = config.overrides?.vaultPath ? 'env/flag' : 'config.json';
  console.log(`Vault:   ${config.vaultPath} (${vaultSource})`);
  console.log(`Project: ${config.projectName} → ${config.projectRoot} (via ${config.matchSource})`);
  for (const folder of config.searchFolders) {
    const dir = projectPath(config, folder);
    const count = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((n) => n.endsWith('.md') && n !== 'TODO.md').length
      : 0;
    console.log(`- ${folder}: ${count} notes`);
  }
  const branch = getGitBranch(config.cwd);
  const ticket = extractTicket(branch, config);
  console.log(`Cwd:     ${config.cwd}`);
  console.log(`Branch:  ${branch || '(none)'}`);
  console.log(`Ticket:  ${ticket || '(none)'}`);
  if (ticket) {
    const story = findStoryByTicket(config, ticket);
    console.log(`Note:    ${story ? story.path : '(missing)'}`);
  }
}

function printHelp() {
  console.log(`Obsidian story sync (global)

Setup once per machine:
  config: ~/.obsidian-story-sync/config.json
  env:    OBSIDIAN_VAULT_PATH (recommended per machine)

Per repository:
  obsidian-sync enable --project <name> [--create-folders]
  obsidian-sync enable --project acme --root Acme --create-folders
  obsidian-sync disable

Daily:
  obsidian-sync start --ticket KEY-123 --title "Story title"
  obsidian-sync commit [--all]
  obsidian-sync find --ticket KEY-123
  obsidian-sync status
  obsidian-sync projects

Useful flags / env:
  --vault / OBSIDIAN_VAULT_PATH
  --root / OBSIDIAN_PROJECT_ROOT
  --jira-base / OBSIDIAN_JIRA_BASE_URL
  --ticket-pattern / OBSIDIAN_TICKET_PATTERN
  --in-progress-folder / OBSIDIAN_IN_PROGRESS_FOLDER
  --search-folders / OBSIDIAN_SEARCH_FOLDERS   (comma-separated)
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  if (!command || args.help || args.h) {
    printHelp();
    return;
  }

  const raw = loadRawConfig();

  switch (command) {
    case 'projects':
      cmdProjects(raw, args);
      break;
    case 'enable':
      cmdEnable(raw, args);
      break;
    case 'disable':
      cmdDisable(args);
      break;
    case 'start':
      cmdStart(resolveConfig(raw, args), args);
      break;
    case 'commit':
      cmdCommit(resolveConfig(raw, args), args);
      break;
    case 'find':
      cmdFind(resolveConfig(raw, args), args);
      break;
    case 'status':
      cmdStatus(resolveConfig(raw, args));
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`ERROR\t${error.message}`);
  process.exit(1);
}
