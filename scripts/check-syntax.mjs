import { readdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, extname } from 'node:path';

const ROOTS = [ 'js', 'scripts' ];
const EXTENSIONS = new Set( [ '.js', '.mjs' ] );

async function collectFiles( directory, files ) {

	const entries = await readdir( directory, { withFileTypes: true } );
	for ( const entry of entries ) {

		const fullPath = join( directory, entry.name );
		if ( entry.isDirectory() ) {

			await collectFiles( fullPath, files );
			continue;

		}

		if ( EXTENSIONS.has( extname( entry.name ) ) ) {

			files.push( fullPath );

		}

	}

}

async function pathExists( path ) {

	try {

		await stat( path );
		return true;

	} catch {

		return false;

	}

}

async function main() {

	const files = [];

	for ( const root of ROOTS ) {

		if ( await pathExists( root ) ) {

			await collectFiles( root, files );

		}

	}

	files.sort();

	if ( files.length === 0 ) {

		console.error( 'No JavaScript files found to validate.' );
		process.exit( 1 );

	}

	let hasErrors = false;

	for ( const file of files ) {

		const result = spawnSync( process.execPath, [ '--check', file ], { encoding: 'utf8' } );

		if ( result.status === 0 ) {

			console.log( `OK ${ file }` );
			continue;

		}

		hasErrors = true;
		console.error( `FAILED ${ file }` );
		if ( result.stderr ) console.error( result.stderr.trim() );
		if ( result.stdout ) console.error( result.stdout.trim() );

	}

	if ( hasErrors ) {

		process.exit( 1 );

	}

	console.log( `Syntax check passed for ${ files.length } files.` );

}

main().catch( ( error ) => {

	console.error( error );
	process.exit( 1 );

} );
