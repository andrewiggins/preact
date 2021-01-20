const fs = require('fs');
const { execFileSync } = require('child_process');
const github = require('@actions/github');

// TODO: Maybe use github actions logger?
const log = console;

function gitRevParse(ref, abbrev = false) {
	const args = ['rev-parse'];
	if (abbrev) {
		args.push('--abbrev-ref');
	}

	args.push(ref);
	return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function gitChangedFiles(ref1, ref2) {
	return execFileSync('git', ['diff', '--name-only', ref1, ref2], {
		encoding: 'utf8'
	})
		.trim()
		.split('\n')
		.map(s => s.trim());
}

/**
 * @param {ReturnType<typeof github.getOctokit>} octokit
 * @param {{ owner: string; repo: string; number: number }} pr
 * @returns {Promise<string[]>}
 */
async function prChangedFiles(octokit, pr) {
	return (
		await octokit.pulls.listFiles({
			owner: pr.owner,
			repo: pr.repo,
			pull_number: pr.number
		})
	).data.map(file => file.filename);
}

/**
 * @typedef Metadata
 * @property {string[]} changedPaths
 * @property {{ ref: string; sha: string; }} base
 *
 * @returns {Promise<Metadata>}
 */
async function getMetadata() {
	/** @type {string[]} */
	let changedPaths;
	let baseRef;
	let baseSha;

	if (github.context.eventName == 'push') {
		// If run in push action, use commit before push
		baseSha = github.context.payload.before;
		baseRef = github.context.payload.ref;
		changedPaths = gitChangedFiles('HEAD', baseSha);

		log.info(`Ref of push is ${baseRef}`);
		log.info(`Previous commit before push is ${baseSha}`);
	} else if (github.context.eventName == 'pull_request') {
		// If run in PR action, use PR base
		baseSha = github.context.payload.pull_request.base.sha;
		baseRef = github.context.payload.pull_request.base.ref;
		changedPaths = await prChangedFiles(
			github.getOctokit(process.argv[2]),
			github.context.issue
		);

		log.info(`Base ref of pull request is ${baseRef}`);
		log.info(`Base commit of pull request is ${baseSha}`);
	} else if (gitRevParse('HEAD', true) == 'master') {
		// If on master, use previous commit to master
		baseSha = gitRevParse('HEAD~1');
		baseRef = 'master';
		changedPaths = gitChangedFiles('HEAD', baseSha);

		log.info(`On master. Previous commit to master is ${baseSha}`);
	} else {
		// If not on master, use master as base
		baseSha = gitRevParse('HEAD');
		baseRef = 'master';
		changedPaths = gitChangedFiles('HEAD', baseSha);

		log.info(`Using master as base. Master is at ${baseSha}`);
	}

	return {
		changedPaths,
		base: {
			ref: baseRef,
			sha: baseSha
		}
	};
}

async function main() {
	const metadata = await getMetadata();
	console.log(metadata);

	fs.writeFileSync(
		'metadata.json',
		// Ensure file has final newline for printing to console
		JSON.stringify(metadata, null, 2) + '\n',
		'utf8'
	);
}

main();
