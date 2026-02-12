import test from 'node:test';
import assert from 'node:assert/strict';

import { ShaderGraphStore } from '../js/shaderbuilder/ShaderGraphStore.js';

function createMemoryStorage() {

	const map = new Map();
	return {
		getItem( key ) {

			return map.has( key ) ? map.get( key ) : null;

		},
		setItem( key, value ) {

			map.set( key, String( value ) );

		},
		removeItem( key ) {

			map.delete( key );

		}
	};

}

function createGraph() {

	return {
		version: 1,
		nodes: [
			{ id: 1, type: 'input/vec3', properties: { x: 1, y: 0.5, z: 0.2 }, outputs: [ { name: 'value', type: 'vec3', links: [ 1 ] } ] },
			{ id: 2, type: 'output/color', inputs: [ { name: 'color', type: 'vec3', link: 1 }, { name: 'alpha', type: 'float', link: null } ], outputs: [] }
		],
		links: [ [ 1, 1, 0, 2, 0, 0 ] ]
	};

}

test( 'ShaderGraphStore saves and loads graphs', () => {

	const store = new ShaderGraphStore( { storage: createMemoryStorage(), maxItems: 30 } );
	const graph = createGraph();

	const saved = store.saveGraph( 'My Graph', graph );
	assert.ok( saved?.id );

	const loaded = store.getGraph( saved.id );
	assert.equal( loaded.name, 'My Graph' );
	assert.deepEqual( loaded.graph.nodes[ 0 ].properties, graph.nodes[ 0 ].properties );

} );

test( 'ShaderGraphStore export/import roundtrip', () => {

	const store = new ShaderGraphStore( { storage: createMemoryStorage(), maxItems: 30 } );
	const graph = createGraph();
	const exported = store.exportGraph( graph, 'Roundtrip' );
	const imported = store.importGraph( exported );

	assert.equal( imported.name, 'Roundtrip' );
	assert.deepEqual( imported.graph.links, graph.links );

} );

test( 'ShaderGraphStore rejects invalid import payload', () => {

	const store = new ShaderGraphStore( { storage: createMemoryStorage(), maxItems: 30 } );

	assert.throws( () => store.importGraph( '{"hello":1}' ), /must include nodes array/i );
	assert.throws( () => store.importGraph( 'not-json' ), /not valid JSON/i );

} );

test( 'ShaderGraphStore enforces max item limit', () => {

	const store = new ShaderGraphStore( { storage: createMemoryStorage(), maxItems: 2 } );

	store.saveGraph( 'Graph A', createGraph() );
	store.saveGraph( 'Graph B', createGraph() );
	store.saveGraph( 'Graph C', createGraph() );

	const list = store.listGraphs();
	assert.equal( list.length, 2 );

} );
