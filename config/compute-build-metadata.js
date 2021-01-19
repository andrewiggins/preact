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

/**
 * @typedef Metadata
 * @property {string[]} changedPaths
 * @property {{ ref: string; sha: string; }} base
 *
 * @returns {Metadata}
 */
function getMetadata() {
	let baseRef;
	let baseSha;
	if (github.context.eventName == 'push') {
		// If run in push action, use commit before push
		baseSha = github.context.payload.before;
		baseRef = github.context.payload.ref;

		log.info(`Ref of push is ${baseRef}`);
		log.info(`Previous commit before push is ${baseSha}`);
	} else if (github.context.eventName == 'pull_request') {
		// If run in PR action, use PR base
		baseSha = github.context.payload.pull_request.base.sha;
		baseRef = github.context.payload.pull_request.base.ref;

		log.info(`Base ref of pull request is ${baseRef}`);
		log.info(`Base commit of pull request is ${baseSha}`);
	} else if (gitRevParse('HEAD', true) == 'master') {
		// If on master, use previous commit to master
		baseSha = gitRevParse('HEAD~1');
		baseRef = gitRevParse('HEAD~1', true);

		log.info(`On master. Previous commit to master is ${baseSha}`);
	} else {
		// If not on master, use master as base
		baseSha = gitRevParse('HEAD');
		baseRef = 'master';

		log.info(`Using master as base. Master is at ${baseSha}`);
	}

	/** @type {string[]} */
	const changedPaths = execFileSync(
		'git',
		['diff', '--name-only', 'HEAD', baseSha],
		{ encoding: 'utf8' }
	)
		.trim()
		.split('\n')
		.map(s => s.trim());

	return {
		changedPaths,
		base: {
			ref: baseRef,
			sha: baseSha
		}
	};
}

const metadata = getMetadata();
console.log(metadata);

fs.writeFileSync('metadata.json', JSON.stringify(metadata, null, 2), 'utf8');
