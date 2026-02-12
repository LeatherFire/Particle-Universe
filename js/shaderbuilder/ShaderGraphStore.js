const STORAGE_KEYS = {
	GRAPHS: 'particle_universe_shader_graphs_v1',
	ACTIVE_GRAPH_ID: 'particle_universe_shader_graph_active_v1'
};

const GRAPH_VERSION = 1;
const DEFAULT_MAX_ITEMS = 30;

function nowIso() {

	return new Date().toISOString();

}

function deepClone( value ) {

	return JSON.parse( JSON.stringify( value ) );

}

function sanitizeName( name ) {

	const normalized = String( name || '' ).trim();
	if ( normalized.length === 0 ) return 'Untitled Shader Graph';
	return normalized.slice( 0, 64 );

}

function createInMemoryStorage() {

	const memory = new Map();
	return {
		getItem( key ) {

			return memory.has( key ) ? memory.get( key ) : null;

		},
		setItem( key, value ) {

			memory.set( key, String( value ) );

		},
		removeItem( key ) {

			memory.delete( key );

		}
	};

}

function validateGraphPayload( graph ) {

	if ( ! graph || typeof graph !== 'object' ) throw new Error( 'Graph payload must be an object.' );
	if ( ! Array.isArray( graph.nodes ) ) throw new Error( 'Graph payload must include nodes array.' );
	if ( ! Array.isArray( graph.links ) ) throw new Error( 'Graph payload must include links array.' );

}

function parseLibrary( raw ) {

	if ( ! raw ) return { version: GRAPH_VERSION, items: [] };
	try {

		const parsed = JSON.parse( raw );
		if ( ! parsed || typeof parsed !== 'object' ) return { version: GRAPH_VERSION, items: [] };
		const items = Array.isArray( parsed.items ) ? parsed.items : [];
		return {
			version: GRAPH_VERSION,
			items: items
				.filter( ( item ) => item && typeof item === 'object' && typeof item.id === 'string' && item.graph )
				.map( ( item ) => ( {
					id: item.id,
					name: sanitizeName( item.name ),
					graph: item.graph,
					createdAt: typeof item.createdAt === 'string' ? item.createdAt : nowIso(),
					updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : nowIso()
				} ) )
		};

	} catch ( error ) {

		return { version: GRAPH_VERSION, items: [] };

	}

}

function sortByUpdatedDesc( items ) {

	return items.sort( ( left, right ) => right.updatedAt.localeCompare( left.updatedAt ) );

}

export class ShaderGraphStore {

	constructor( options = {} ) {

		this.maxItems = Number.isFinite( options.maxItems ) ? Math.max( 1, Math.floor( options.maxItems ) ) : DEFAULT_MAX_ITEMS;
		this.storage = options.storage || ( typeof window !== 'undefined' && window.localStorage ? window.localStorage : createInMemoryStorage() );

	}

	_getLibrary() {

		const raw = this.storage.getItem( STORAGE_KEYS.GRAPHS );
		const parsed = parseLibrary( raw );
		sortByUpdatedDesc( parsed.items );
		return parsed;

	}

	_saveLibrary( library ) {

		const safe = {
			version: GRAPH_VERSION,
			items: sortByUpdatedDesc( library.items ).slice( 0, this.maxItems )
		};
		this.storage.setItem( STORAGE_KEYS.GRAPHS, JSON.stringify( safe ) );
		return safe;

	}

	listGraphs() {

		return this._getLibrary().items.map( ( item ) => ( {
			id: item.id,
			name: item.name,
			createdAt: item.createdAt,
			updatedAt: item.updatedAt
		} ) );

	}

	getGraph( graphId ) {

		if ( ! graphId ) return null;
		const library = this._getLibrary();
		const found = library.items.find( ( item ) => item.id === graphId );
		if ( ! found ) return null;
		return {
			id: found.id,
			name: found.name,
			graph: deepClone( found.graph ),
			createdAt: found.createdAt,
			updatedAt: found.updatedAt
		};

	}

	saveGraph( name, graph, existingId = null ) {

		validateGraphPayload( graph );
		const library = this._getLibrary();
		const timestamp = nowIso();
		const normalizedName = sanitizeName( name );
		const id = existingId || `graph_${ Date.now() }_${ Math.floor( Math.random() * 1e6 ) }`;

		const existingIndex = library.items.findIndex( ( item ) => item.id === id );
		if ( existingIndex >= 0 ) {

			library.items[ existingIndex ] = {
				...library.items[ existingIndex ],
				name: normalizedName,
				graph: deepClone( graph ),
				updatedAt: timestamp
			};

		} else {

			library.items.push( {
				id,
				name: normalizedName,
				graph: deepClone( graph ),
				createdAt: timestamp,
				updatedAt: timestamp
			} );

		}

		const saved = this._saveLibrary( library );
		if ( saved.items.length > 0 ) this.setActiveGraphId( id );

		return this.getGraph( id );

	}

	deleteGraph( graphId ) {

		if ( ! graphId ) return false;
		const library = this._getLibrary();
		const beforeLength = library.items.length;
		library.items = library.items.filter( ( item ) => item.id !== graphId );
		if ( library.items.length === beforeLength ) return false;
		this._saveLibrary( library );

		if ( this.getActiveGraphId() === graphId ) {

			this.storage.removeItem( STORAGE_KEYS.ACTIVE_GRAPH_ID );

		}

		return true;

	}

	getActiveGraphId() {

		const active = this.storage.getItem( STORAGE_KEYS.ACTIVE_GRAPH_ID );
		if ( ! active || typeof active !== 'string' ) return null;
		return active;

	}

	setActiveGraphId( graphId ) {

		if ( ! graphId ) {

			this.storage.removeItem( STORAGE_KEYS.ACTIVE_GRAPH_ID );
			return;

		}
		this.storage.setItem( STORAGE_KEYS.ACTIVE_GRAPH_ID, String( graphId ) );

	}

	exportGraph( graph, name = 'Shader Graph' ) {

		validateGraphPayload( graph );
		return JSON.stringify( {
			version: GRAPH_VERSION,
			name: sanitizeName( name ),
			graph: deepClone( graph )
		}, null, 2 );

	}

	importGraph( serialized ) {

		if ( typeof serialized !== 'string' || serialized.trim().length === 0 ) {

			throw new Error( 'Import payload is empty.' );

		}

		let parsed;
		try {

			parsed = JSON.parse( serialized );

		} catch ( error ) {

			throw new Error( 'Import payload is not valid JSON.' );

		}

		if ( ! parsed || typeof parsed !== 'object' ) throw new Error( 'Import payload is invalid.' );

		const graph = parsed.graph || parsed;
		validateGraphPayload( graph );

		return {
			name: sanitizeName( parsed.name || 'Imported Shader Graph' ),
			graph: deepClone( graph )
		};

	}

}

export { STORAGE_KEYS as SHADER_GRAPH_STORAGE_KEYS, GRAPH_VERSION as SHADER_GRAPH_VERSION };
