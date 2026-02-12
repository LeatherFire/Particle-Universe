import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = Number( process.env.PORT || 5173 );
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = process.cwd();

const MIME_TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.glb': 'model/gltf-binary',
	'.gltf': 'model/gltf+json',
	'.bin': 'application/octet-stream',
	'.webm': 'video/webm',
	'.txt': 'text/plain; charset=utf-8'
};

function safeDecode( value ) {

	try {

		return decodeURIComponent( value );

	} catch {

		return value;

	}

}

function getFilePathFromUrl( rawUrl ) {

	const pathname = safeDecode( ( rawUrl || '/' ).split( '?' )[ 0 ] );
	const relativePath = pathname === '/' ? '/index.html' : pathname;
	const normalizedPath = normalize( relativePath ).replace( /^([.][.][/\\])+/, '' );
	return join( ROOT, normalizedPath );

}

function writeStatus( res, statusCode, message ) {

	res.writeHead( statusCode, {
		'Content-Type': 'text/plain; charset=utf-8',
		'Cache-Control': 'no-store'
	} );
	res.end( message );

}

const server = createServer( async ( req, res ) => {

	if ( req.method !== 'GET' && req.method !== 'HEAD' ) {

		writeStatus( res, 405, 'Method Not Allowed' );
		return;

	}

	let filePath = getFilePathFromUrl( req.url );

	try {

		let fileStat = await stat( filePath );

		if ( fileStat.isDirectory() ) {

			filePath = join( filePath, 'index.html' );
			fileStat = await stat( filePath );

		}

		const extension = extname( filePath ).toLowerCase();
		const mimeType = MIME_TYPES[ extension ] || 'application/octet-stream';

		res.writeHead( 200, {
			'Content-Type': mimeType,
			'Content-Length': fileStat.size,
			'Cache-Control': 'no-store'
		} );

		if ( req.method === 'HEAD' ) {

			res.end();
			return;

		}

		const stream = createReadStream( filePath );
		stream.on( 'error', () => writeStatus( res, 500, 'Failed to read file' ) );
		stream.pipe( res );

	} catch {

		writeStatus( res, 404, 'Not Found' );

	}

} );

server.listen( PORT, HOST, () => {

	console.log( `Dev server running at http://${ HOST }:${ PORT }` );

} );
