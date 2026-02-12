import test from 'node:test';
import assert from 'node:assert/strict';

import { compileShaderGraph } from '../js/shaderbuilder/ShaderGraphCompiler.js';
import { getDefaultShaderTemplate } from '../js/shaderbuilder/ShaderGraphTemplates.js';

function createSimpleGraph() {

	return {
		version: 1,
		nodes: [
			{
				id: 1,
				type: 'input/vec3',
				properties: { x: 1, y: 0.5, z: 0.2 },
				outputs: [ { name: 'value', type: 'vec3', links: [ 1 ] } ]
			},
			{
				id: 2,
				type: 'input/float',
				properties: { value: 0.65 },
				outputs: [ { name: 'value', type: 'float', links: [ 2 ] } ]
			},
			{
				id: 3,
				type: 'output/color',
				inputs: [
					{ name: 'color', type: 'vec3', link: 1 },
					{ name: 'alpha', type: 'float', link: 2 }
				],
				outputs: []
			}
		],
		links: [
			[ 1, 1, 0, 3, 0, 0 ],
			[ 2, 2, 0, 3, 1, 0 ]
		]
	};

}

test( 'compileShaderGraph compiles default template graph', () => {

	const template = getDefaultShaderTemplate();
	assert.ok( template, 'default template should exist' );

	const compiled = compileShaderGraph( template.graph );
	assert.equal( typeof compiled.vertexShader, 'string' );
	assert.equal( typeof compiled.fragmentShader, 'string' );
	assert.equal( typeof compiled.baseVertexShader, 'string' );
	assert.equal( typeof compiled.baseFragmentShader, 'string' );
	assert.equal( typeof compiled.compositeFragmentShader, 'string' );
	assert.ok( compiled.passConfig && typeof compiled.passConfig === 'object' );
	assert.ok( compiled.compiledPassSources && typeof compiled.compiledPassSources === 'object' );
	assert.match( compiled.fragmentShader, /gl_FragColor/ );
	assert.ok( compiled.uniformDefaults.uOpacity > 0 );

} );

test( 'compileShaderGraph compiles minimal graph', () => {

	const graph = createSimpleGraph();
	const compiled = compileShaderGraph( graph );
	assert.match( compiled.fragmentShader, /uOpacity/ );
	assert.match( compiled.fragmentShader, /uIntensity/ );
	assert.match( compiled.fragmentShader, /sampleStageSurface/ );
	assert.match( compiled.fragmentShader, /uShaderMode/ );
	assert.match( compiled.compositeFragmentShader, /uBaseTex/ );
	assert.match( compiled.compiledPassSources.postFxConfig, /bloomAmount/ );

} );

test( 'compileShaderGraph exposes dynamic input uniforms for runtime controls', () => {

	const graph = createSimpleGraph();
	const compiled = compileShaderGraph( graph );
	const dynamicUniforms = compiled.uniformDefaults.dynamicUniforms || [];
	const names = dynamicUniforms.map( ( entry ) => entry.uniformName );

	assert.ok( Array.isArray( dynamicUniforms ) );
	assert.ok( names.includes( 'uParamVec3_1' ) );
	assert.ok( names.includes( 'uParamFloat_2' ) );
	assert.match( compiled.fragmentShader, /uniform vec3 uParamVec3_1;/ );
	assert.match( compiled.fragmentShader, /uniform float uParamFloat_2;/ );

} );

test( 'compileShaderGraph supports texture sample nodes', () => {

	const graph = {
		version: 1,
		nodes: [
			{
				id: 1,
				type: 'input/uv',
				properties: {},
				outputs: [ { name: 'uv', type: 'vec2', links: [ 1 ] } ]
			},
			{
				id: 2,
				type: 'texture/samplea',
				properties: {},
				inputs: [
					{ name: 'uv', type: 'vec2', link: 1 },
					{ name: 'scale', type: 'float', link: null }
				],
				outputs: [ { name: 'out', type: 'vec3', links: [ 2 ] } ]
			},
			{
				id: 3,
				type: 'output/color',
				inputs: [
					{ name: 'color', type: 'vec3', link: 2 },
					{ name: 'alpha', type: 'float', link: null }
				],
				outputs: []
			}
		],
		links: [
			[ 1, 1, 0, 2, 0, 0 ],
			[ 2, 2, 0, 3, 0, 0 ]
		]
	};

	const compiled = compileShaderGraph( graph );
	assert.match( compiled.fragmentShader, /uTexA/ );
	assert.match( compiled.fragmentShader, /texture2D\( uTexA/ );

} );

test( 'compileShaderGraph compiles optional output/postfx graph', () => {

	const graph = {
		version: 1,
		nodes: [
			{
				id: 1,
				type: 'input/vec3',
				properties: { x: 1, y: 0.4, z: 0.2 },
				outputs: [ { name: 'value', type: 'vec3', links: [ 1 ] } ]
			},
			{
				id: 2,
				type: 'input/float',
				properties: { value: 0.8 },
				outputs: [ { name: 'value', type: 'float', links: [ 2 ] } ]
			},
			{
				id: 3,
				type: 'postfx/bloom',
				inputs: [ { name: 'amount', type: 'float', link: 2 } ],
				outputs: [ { name: 'out', type: 'float', links: [ 3 ] } ]
			},
			{
				id: 4,
				type: 'output/color',
				inputs: [
					{ name: 'color', type: 'vec3', link: 1 },
					{ name: 'alpha', type: 'float', link: null }
				],
				outputs: []
			},
			{
				id: 5,
				type: 'output/postfx',
				inputs: [
					{ name: 'bloom', type: 'float', link: 3 },
					{ name: 'blur', type: 'float', link: null },
					{ name: 'feedback', type: 'float', link: null },
					{ name: 'vignette', type: 'float', link: null },
					{ name: 'chromatic', type: 'float', link: null }
				],
				outputs: []
			}
		],
		links: [
			[ 1, 1, 0, 4, 0, 0 ],
			[ 2, 2, 0, 3, 0, 0 ],
			[ 3, 3, 0, 5, 0, 0 ]
		]
	};

	const compiled = compileShaderGraph( graph );
	assert.match( compiled.compositeFragmentShader, /bloomAmount/ );
	assert.ok( compiled.passConfig.bloomAmount >= 0 );

} );

test( 'compileShaderGraph rejects unsupported node type', () => {

	const graph = createSimpleGraph();
	graph.nodes.push( {
		id: 99,
		type: 'unsupported/node',
		inputs: [],
		outputs: []
	} );

	assert.throws( () => compileShaderGraph( graph ), /Unsupported node type/ );

} );

test( 'compileShaderGraph detects cycles', () => {

	const graph = {
		version: 1,
		nodes: [
			{
				id: 1,
				type: 'input/float',
				properties: { value: 0.4 },
				outputs: [ { name: 'value', type: 'float', links: [ 1 ] } ]
			},
			{
				id: 2,
				type: 'math/add',
				inputs: [
					{ name: 'a', type: 'dynamic', link: 1 },
					{ name: 'b', type: 'dynamic', link: 2 }
				],
				outputs: [ { name: 'out', type: 'dynamic', links: [ 2, 3 ] } ]
			},
			{
				id: 3,
				type: 'output/color',
				inputs: [
					{ name: 'color', type: 'vec3', link: 3 },
					{ name: 'alpha', type: 'float', link: null }
				],
				outputs: []
			}
		],
		links: [
			[ 1, 1, 0, 2, 0, 0 ],
			[ 2, 2, 0, 2, 1, 0 ],
			[ 3, 2, 0, 3, 0, 0 ]
		]
	};

	assert.throws( () => compileShaderGraph( graph ), /Cycle detected/ );

} );
