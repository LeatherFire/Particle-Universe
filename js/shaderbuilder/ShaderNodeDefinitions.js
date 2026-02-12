export const SHADER_NODE_LIMIT = 64;

function defineNode( config ) {

	return {
		title: config.title,
		category: config.category,
		tier: config.tier || 'basic',
		inputs: Array.isArray( config.inputs ) ? config.inputs : [],
		outputs: Array.isArray( config.outputs ) ? config.outputs : [],
		defaults: config.defaults && typeof config.defaults === 'object' ? config.defaults : {}
	};

}

export const SHADER_NODE_DEFINITIONS = {
	'input/uv': defineNode( {
		title: 'UV',
		category: 'Inputs',
		inputs: [],
		outputs: [ { name: 'uv', type: 'vec2' } ],
		defaults: {}
	} ),
	'input/time': defineNode( {
		title: 'Time',
		category: 'Inputs',
		inputs: [],
		outputs: [ { name: 'time', type: 'float' } ],
		defaults: {}
	} ),
	'input/resolution': defineNode( {
		title: 'Resolution',
		category: 'Inputs',
		inputs: [],
		outputs: [ { name: 'resolution', type: 'vec2' } ],
		defaults: {}
	} ),
	'input/mouse': defineNode( {
		title: 'Mouse',
		category: 'Inputs',
		inputs: [],
		outputs: [ { name: 'mouse', type: 'vec2' } ],
		defaults: {}
	} ),
	'input/float': defineNode( {
		title: 'Float',
		category: 'Inputs',
		inputs: [],
		outputs: [ { name: 'value', type: 'float' } ],
		defaults: { value: 0.5 }
	} ),
	'input/vec2': defineNode( {
		title: 'Vec2',
		category: 'Inputs',
		inputs: [],
		outputs: [ { name: 'value', type: 'vec2' } ],
		defaults: { x: 0.5, y: 0.5 }
	} ),
	'input/vec3': defineNode( {
		title: 'Vec3',
		category: 'Inputs',
		inputs: [],
		outputs: [ { name: 'value', type: 'vec3' } ],
		defaults: { x: 1.0, y: 0.5, z: 0.2 }
	} ),

	'math/add': defineNode( {
		title: 'Add',
		category: 'Math',
		inputs: [
			{ name: 'a', type: 'dynamic', default: 0.0 },
			{ name: 'b', type: 'dynamic', default: 0.0 }
		],
		outputs: [ { name: 'out', type: 'dynamic' } ],
		defaults: {}
	} ),
	'math/sub': defineNode( {
		title: 'Sub',
		category: 'Math',
		inputs: [
			{ name: 'a', type: 'dynamic', default: 0.0 },
			{ name: 'b', type: 'dynamic', default: 0.0 }
		],
		outputs: [ { name: 'out', type: 'dynamic' } ],
		defaults: {}
	} ),
	'math/mul': defineNode( {
		title: 'Mul',
		category: 'Math',
		inputs: [
			{ name: 'a', type: 'dynamic', default: 1.0 },
			{ name: 'b', type: 'dynamic', default: 1.0 }
		],
		outputs: [ { name: 'out', type: 'dynamic' } ],
		defaults: {}
	} ),
	'math/div': defineNode( {
		title: 'Div',
		category: 'Math',
		inputs: [
			{ name: 'a', type: 'dynamic', default: 1.0 },
			{ name: 'b', type: 'dynamic', default: 1.0 }
		],
		outputs: [ { name: 'out', type: 'dynamic' } ],
		defaults: {}
	} ),
	'math/mix': defineNode( {
		title: 'Mix',
		category: 'Math',
		inputs: [
			{ name: 'a', type: 'dynamic', default: 0.0 },
			{ name: 'b', type: 'dynamic', default: 1.0 },
			{ name: 't', type: 'float', default: 0.5 }
		],
		outputs: [ { name: 'out', type: 'dynamic' } ],
		defaults: {}
	} ),
	'math/clamp': defineNode( {
		title: 'Clamp',
		category: 'Math',
		inputs: [
			{ name: 'x', type: 'dynamic', default: 0.0 },
			{ name: 'min', type: 'float', default: 0.0 },
			{ name: 'max', type: 'float', default: 1.0 }
		],
		outputs: [ { name: 'out', type: 'dynamic' } ],
		defaults: {}
	} ),
	'math/smoothstep': defineNode( {
		title: 'Smoothstep',
		category: 'Math',
		inputs: [
			{ name: 'edge0', type: 'float', default: 0.2 },
			{ name: 'edge1', type: 'float', default: 0.8 },
			{ name: 'x', type: 'dynamic', default: 0.5 }
		],
		outputs: [ { name: 'out', type: 'dynamic' } ],
		defaults: {}
	} ),
	'math/pow': defineNode( {
		title: 'Pow',
		category: 'Math',
		inputs: [
			{ name: 'x', type: 'dynamic', default: 0.5 },
			{ name: 'exp', type: 'float', default: 2.0 }
		],
		outputs: [ { name: 'out', type: 'dynamic' } ],
		defaults: {}
	} ),
	'math/sin': defineNode( {
		title: 'Sin',
		category: 'Math',
		inputs: [ { name: 'x', type: 'dynamic', default: 0.0 } ],
		outputs: [ { name: 'out', type: 'dynamic' } ],
		defaults: {}
	} ),
	'math/cos': defineNode( {
		title: 'Cos',
		category: 'Math',
		inputs: [ { name: 'x', type: 'dynamic', default: 0.0 } ],
		outputs: [ { name: 'out', type: 'dynamic' } ],
		defaults: {}
	} ),
	'math/abs': defineNode( {
		title: 'Abs',
		category: 'Math',
		inputs: [ { name: 'x', type: 'dynamic', default: 0.0 } ],
		outputs: [ { name: 'out', type: 'dynamic' } ],
		defaults: {}
	} ),
	'math/length': defineNode( {
		title: 'Length',
		category: 'Math',
		inputs: [ { name: 'x', type: 'dynamic', default: 0.0 } ],
		outputs: [ { name: 'out', type: 'float' } ],
		defaults: {}
	} ),

	'pattern/rotate2d': defineNode( {
		title: 'Rotate2D',
		category: 'Pattern',
		inputs: [
			{ name: 'uv', type: 'vec2', default: [ 0.5, 0.5 ] },
			{ name: 'angle', type: 'float', default: 0.0 }
		],
		outputs: [ { name: 'out', type: 'vec2' } ],
		defaults: {}
	} ),
	'pattern/polar': defineNode( {
		title: 'Polar',
		category: 'Pattern',
		inputs: [ { name: 'uv', type: 'vec2', default: [ 0.5, 0.5 ] } ],
		outputs: [ { name: 'out', type: 'vec2' } ],
		defaults: {}
	} ),
	'pattern/noise2d': defineNode( {
		title: 'Noise2D',
		category: 'Pattern',
		inputs: [
			{ name: 'p', type: 'vec2', default: [ 0.0, 0.0 ] },
			{ name: 'scale', type: 'float', default: 1.0 }
		],
		outputs: [ { name: 'out', type: 'float' } ],
		defaults: {}
	} ),
	'pattern/fbm': defineNode( {
		title: 'FBM',
		category: 'Pattern',
		inputs: [
			{ name: 'p', type: 'vec2', default: [ 0.0, 0.0 ] },
			{ name: 'scale', type: 'float', default: 1.0 }
		],
		outputs: [ { name: 'out', type: 'float' } ],
		defaults: {}
	} ),

	'texture/samplea': defineNode( {
		title: 'Texture A',
		category: 'Textures',
		inputs: [
			{ name: 'uv', type: 'vec2', default: [ 0.5, 0.5 ] },
			{ name: 'scale', type: 'float', default: 1.0 }
		],
		outputs: [ { name: 'out', type: 'vec3' } ],
		defaults: {}
	} ),
	'texture/sampleb': defineNode( {
		title: 'Texture B',
		category: 'Textures',
		inputs: [
			{ name: 'uv', type: 'vec2', default: [ 0.5, 0.5 ] },
			{ name: 'scale', type: 'float', default: 1.0 }
		],
		outputs: [ { name: 'out', type: 'vec3' } ],
		defaults: {}
	} ),

	'color/ramp3': defineNode( {
		title: 'ColorRamp3',
		category: 'Color',
		inputs: [
			{ name: 't', type: 'float', default: 0.5 },
			{ name: 'c0', type: 'vec3', default: [ 0.12, 0.16, 0.32 ] },
			{ name: 'c1', type: 'vec3', default: [ 0.25, 0.55, 0.95 ] },
			{ name: 'c2', type: 'vec3', default: [ 1.0, 0.8, 0.35 ] }
		],
		outputs: [ { name: 'out', type: 'vec3' } ],
		defaults: {}
	} ),
	'color/hueshift': defineNode( {
		title: 'HueShift',
		category: 'Color',
		inputs: [
			{ name: 'color', type: 'vec3', default: [ 1.0, 0.6, 0.2 ] },
			{ name: 'shift', type: 'float', default: 0.0 }
		],
		outputs: [ { name: 'out', type: 'vec3' } ],
		defaults: {}
	} ),
	'color/saturate': defineNode( {
		title: 'Saturate',
		category: 'Color',
		inputs: [ { name: 'x', type: 'dynamic', default: 0.5 } ],
		outputs: [ { name: 'out', type: 'dynamic' } ],
		defaults: {}
	} ),

	'advanced/math/remap': defineNode( {
		title: 'Remap',
		category: 'Advanced',
		tier: 'advanced',
		inputs: [
			{ name: 'x', type: 'dynamic', default: 0.5 },
			{ name: 'inMin', type: 'float', default: 0.0 },
			{ name: 'inMax', type: 'float', default: 1.0 },
			{ name: 'outMin', type: 'float', default: 0.0 },
			{ name: 'outMax', type: 'float', default: 1.0 }
		],
		outputs: [ { name: 'out', type: 'dynamic' } ],
		defaults: {}
	} ),
	'advanced/math/min': defineNode( {
		title: 'Min',
		category: 'Advanced',
		tier: 'advanced',
		inputs: [
			{ name: 'a', type: 'dynamic', default: 0.0 },
			{ name: 'b', type: 'dynamic', default: 1.0 }
		],
		outputs: [ { name: 'out', type: 'dynamic' } ],
		defaults: {}
	} ),
	'advanced/math/max': defineNode( {
		title: 'Max',
		category: 'Advanced',
		tier: 'advanced',
		inputs: [
			{ name: 'a', type: 'dynamic', default: 0.0 },
			{ name: 'b', type: 'dynamic', default: 1.0 }
		],
		outputs: [ { name: 'out', type: 'dynamic' } ],
		defaults: {}
	} ),
	'advanced/math/step': defineNode( {
		title: 'Step',
		category: 'Advanced',
		tier: 'advanced',
		inputs: [
			{ name: 'edge', type: 'float', default: 0.5 },
			{ name: 'x', type: 'dynamic', default: 0.5 }
		],
		outputs: [ { name: 'out', type: 'dynamic' } ],
		defaults: {}
	} ),
	'advanced/math/fract': defineNode( {
		title: 'Fract',
		category: 'Advanced',
		tier: 'advanced',
		inputs: [ { name: 'x', type: 'dynamic', default: 0.5 } ],
		outputs: [ { name: 'out', type: 'dynamic' } ],
		defaults: {}
	} ),
	'advanced/pattern/voronoi2d': defineNode( {
		title: 'Voronoi2D',
		category: 'Advanced',
		tier: 'advanced',
		inputs: [
			{ name: 'p', type: 'vec2', default: [ 0.0, 0.0 ] },
			{ name: 'scale', type: 'float', default: 6.0 },
			{ name: 'jitter', type: 'float', default: 1.0 }
		],
		outputs: [ { name: 'out', type: 'float' } ],
		defaults: {}
	} ),
	'advanced/pattern/domainwarp2d': defineNode( {
		title: 'DomainWarp2D',
		category: 'Advanced',
		tier: 'advanced',
		inputs: [
			{ name: 'p', type: 'vec2', default: [ 0.0, 0.0 ] },
			{ name: 'strength', type: 'float', default: 0.25 },
			{ name: 'speed', type: 'float', default: 1.0 }
		],
		outputs: [ { name: 'out', type: 'vec2' } ],
		defaults: {}
	} ),
	'advanced/pattern/ridgedfbm': defineNode( {
		title: 'RidgedFBM',
		category: 'Advanced',
		tier: 'advanced',
		inputs: [
			{ name: 'p', type: 'vec2', default: [ 0.0, 0.0 ] },
			{ name: 'scale', type: 'float', default: 1.0 },
			{ name: 'gain', type: 'float', default: 0.65 }
		],
		outputs: [ { name: 'out', type: 'float' } ],
		defaults: {}
	} ),
	'advanced/pattern/waterflow2d': defineNode( {
		title: 'WaterFlow2D',
		category: 'Advanced',
		tier: 'advanced',
		inputs: [
			{ name: 'p', type: 'vec2', default: [ 0.0, 0.0 ] },
			{ name: 'scale', type: 'float', default: 2.6 },
			{ name: 'speed', type: 'float', default: 0.6 }
		],
		outputs: [ { name: 'out', type: 'vec2' } ],
		defaults: {}
	} ),
	'advanced/pattern/caustics2d': defineNode( {
		title: 'Caustics2D',
		category: 'Advanced',
		tier: 'advanced',
		inputs: [
			{ name: 'p', type: 'vec2', default: [ 0.0, 0.0 ] },
			{ name: 'scale', type: 'float', default: 5.8 },
			{ name: 'speed', type: 'float', default: 0.55 },
			{ name: 'choppy', type: 'float', default: 1.1 }
		],
		outputs: [ { name: 'out', type: 'float' } ],
		defaults: {}
	} ),
	'advanced/color/gradient5': defineNode( {
		title: 'Gradient5',
		category: 'Advanced',
		tier: 'advanced',
		inputs: [
			{ name: 't', type: 'float', default: 0.5 },
			{ name: 'c0', type: 'vec3', default: [ 0.02, 0.04, 0.15 ] },
			{ name: 'c1', type: 'vec3', default: [ 0.11, 0.28, 0.62 ] },
			{ name: 'c2', type: 'vec3', default: [ 0.28, 0.64, 0.97 ] },
			{ name: 'c3', type: 'vec3', default: [ 0.85, 0.42, 0.96 ] },
			{ name: 'c4', type: 'vec3', default: [ 1.0, 0.88, 0.34 ] }
		],
		outputs: [ { name: 'out', type: 'vec3' } ],
		defaults: {}
	} ),
	'advanced/color/contrast': defineNode( {
		title: 'Contrast',
		category: 'Advanced',
		tier: 'advanced',
		inputs: [
			{ name: 'color', type: 'vec3', default: [ 0.5, 0.5, 0.5 ] },
			{ name: 'amount', type: 'float', default: 1.2 }
		],
		outputs: [ { name: 'out', type: 'vec3' } ],
		defaults: {}
	} ),
	'advanced/color/posterize': defineNode( {
		title: 'Posterize',
		category: 'Advanced',
		tier: 'advanced',
		inputs: [
			{ name: 'color', type: 'vec3', default: [ 1.0, 1.0, 1.0 ] },
			{ name: 'steps', type: 'float', default: 5.0 }
		],
		outputs: [ { name: 'out', type: 'vec3' } ],
		defaults: {}
	} ),

	'postfx/bloom': defineNode( {
		title: 'FX Bloom',
		category: 'Post FX',
		tier: 'advanced',
		inputs: [ { name: 'amount', type: 'float', default: 0.8 } ],
		outputs: [ { name: 'out', type: 'float' } ],
		defaults: {}
	} ),
	'postfx/blur': defineNode( {
		title: 'FX Blur',
		category: 'Post FX',
		tier: 'advanced',
		inputs: [ { name: 'amount', type: 'float', default: 0.45 } ],
		outputs: [ { name: 'out', type: 'float' } ],
		defaults: {}
	} ),
	'postfx/feedback': defineNode( {
		title: 'FX Feedback',
		category: 'Post FX',
		tier: 'advanced',
		inputs: [ { name: 'amount', type: 'float', default: 0.28 } ],
		outputs: [ { name: 'out', type: 'float' } ],
		defaults: {}
	} ),
	'postfx/vignette': defineNode( {
		title: 'FX Vignette',
		category: 'Post FX',
		tier: 'advanced',
		inputs: [ { name: 'amount', type: 'float', default: 0.36 } ],
		outputs: [ { name: 'out', type: 'float' } ],
		defaults: {}
	} ),
	'postfx/chromatic': defineNode( {
		title: 'FX Chromatic',
		category: 'Post FX',
		tier: 'advanced',
		inputs: [ { name: 'amount', type: 'float', default: 0.12 } ],
		outputs: [ { name: 'out', type: 'float' } ],
		defaults: {}
	} ),

	'output/color': defineNode( {
		title: 'OutputColor',
		category: 'Output',
		inputs: [
			{ name: 'color', type: 'vec3', default: [ 0.0, 0.0, 0.0 ] },
			{ name: 'alpha', type: 'float', default: 0.0 }
		],
		outputs: [],
		defaults: {}
	} ),
	'output/postfx': defineNode( {
		title: 'OutputPostFX',
		category: 'Output',
		tier: 'advanced',
		inputs: [
			{ name: 'bloom', type: 'float', default: 0.8 },
			{ name: 'blur', type: 'float', default: 0.45 },
			{ name: 'feedback', type: 'float', default: 0.28 },
			{ name: 'vignette', type: 'float', default: 0.36 },
			{ name: 'chromatic', type: 'float', default: 0.12 }
		],
		outputs: [],
		defaults: {}
	} )
};

export const SHADER_NODE_CATEGORIES = [
	'Inputs',
	'Math',
	'Pattern',
	'Textures',
	'Color',
	'Advanced',
	'Post FX',
	'Output'
];

export const SHADER_NODE_TYPES = Object.keys( SHADER_NODE_DEFINITIONS );

export function getNodeDefinition( type ) {

	return SHADER_NODE_DEFINITIONS[ type ] || null;

}

export function getNodeTier( type ) {

	return SHADER_NODE_DEFINITIONS[ type ]?.tier || 'basic';

}

export function getNodeTypesByCategory( category ) {

	return SHADER_NODE_TYPES.filter( ( type ) => SHADER_NODE_DEFINITIONS[ type ].category === category );

}

export function getNodeTypesByTier( tier = 'basic' ) {

	if ( tier === 'advanced' ) {

		return SHADER_NODE_TYPES.filter( ( type ) => {

			const definition = SHADER_NODE_DEFINITIONS[ type ];
			if ( ! definition ) return false;
			return definition.tier === 'advanced' || definition.category === 'Output';

		} );

	}

	return SHADER_NODE_TYPES.filter( ( type ) => {

		const definition = SHADER_NODE_DEFINITIONS[ type ];
		if ( ! definition ) return false;
		return definition.tier !== 'advanced' || definition.category === 'Output';

	} );

}

export function createNodeDescriptor( type, id, x = 80, y = 80 ) {

	const definition = getNodeDefinition( type );
	if ( ! definition ) throw new Error( `Unsupported node type: ${ type }` );

	const node = {
		id,
		type,
		title: definition.title,
		pos: [ x, y ],
		properties: { ...definition.defaults }
	};

	if ( definition.inputs.length > 0 ) {

		node.inputs = definition.inputs.map( ( input ) => ( {
			name: input.name,
			type: input.type,
			link: null
		} ) );

	}

	if ( definition.outputs.length > 0 ) {

		node.outputs = definition.outputs.map( ( output ) => ( {
			name: output.name,
			type: output.type,
			links: []
		} ) );

	}

	return node;

}
