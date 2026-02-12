import { SHADER_NODE_LIMIT, SHADER_NODE_DEFINITIONS, getNodeDefinition } from './ShaderNodeDefinitions.js';

const VERTEX_SHADER = `
varying vec2 vUv;

void main() {
	vUv = uv;
	gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`;

const BASE_FRAGMENT_HEADER = `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uOpacity;
uniform float uIntensity;
uniform vec3 uTint;
uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform float uShaderMode;
uniform float uPreviewStage;
uniform vec3 uRigLightDir;
uniform float uRigAmbient;
uniform float uRigKey;
uniform float uRigRim;
uniform float uStageZoom;
uniform float uStageRotate;
uniform float uVolumeDensity;
uniform float uVolumeSteps;
uniform float uVolumeStretch;

float sat01( float x ) {
	return clamp( x, 0.0, 1.0 );
}

float remapSafe( float x, float inMin, float inMax, float outMin, float outMax ) {
	float denom = max( abs( inMax - inMin ), 0.0001 );
	return outMin + ( x - inMin ) * ( outMax - outMin ) / denom;
}

vec2 rotate2D( vec2 uv, float angle ) {
	vec2 centered = uv - 0.5;
	float c = cos( angle );
	float s = sin( angle );
	mat2 r = mat2( c, -s, s, c );
	return r * centered + 0.5;
}

vec2 toPolar( vec2 uv ) {
	vec2 p = uv * 2.0 - 1.0;
	float radius = length( p );
	float angle = atan( p.y, p.x );
	return vec2( angle / 6.28318530718 + 0.5, radius );
}

float hash21( vec2 p ) {
	p = fract( p * vec2( 123.34, 345.45 ) );
	p += dot( p, p + 34.345 );
	return fract( p.x * p.y );
}

vec2 hash22( vec2 p ) {
	float n = sin( dot( p, vec2( 41.0, 289.0 ) ) );
	return fract( vec2( 262144.0, 32768.0 ) * n );
}

float noise21( vec2 p ) {
	vec2 i = floor( p );
	vec2 f = fract( p );
	float a = hash21( i );
	float b = hash21( i + vec2( 1.0, 0.0 ) );
	float c = hash21( i + vec2( 0.0, 1.0 ) );
	float d = hash21( i + vec2( 1.0, 1.0 ) );
	vec2 u = f * f * ( 3.0 - 2.0 * f );
	return mix( a, b, u.x ) +
		( c - a ) * u.y * ( 1.0 - u.x ) +
		( d - b ) * u.x * u.y;
}

float fbm21( vec2 p ) {
	float sum = 0.0;
	float amp = 0.5;
	float freq = 1.0;
	for ( int i = 0; i < 6; i ++ ) {
		sum += noise21( p * freq ) * amp;
		freq *= 2.0;
		amp *= 0.5;
	}
	return sum;
}

float ridgedFbm21( vec2 p, float gain ) {
	float sum = 0.0;
	float amp = 0.5;
	float freq = 1.0;
	float ridgeGain = clamp( gain, 0.0, 1.5 );
	for ( int i = 0; i < 5; i ++ ) {
		float n = noise21( p * freq );
		n = 1.0 - abs( n * 2.0 - 1.0 );
		n *= n;
		sum += n * amp;
		freq *= 2.0;
		amp *= mix( 0.3, 0.8, ridgeGain );
	}
	return sat01( sum );
}

float voronoi21( vec2 p, float jitter ) {
	vec2 cell = floor( p );
	vec2 local = fract( p );
	float d = 10.0;
	float j = clamp( jitter, 0.0, 1.25 );
	for ( int y = -1; y <= 1; y ++ ) {
		for ( int x = -1; x <= 1; x ++ ) {
			vec2 offset = vec2( float( x ), float( y ) );
			vec2 h = hash22( cell + offset );
			vec2 point = offset + mix( vec2( 0.5 ), h, j );
			d = min( d, length( point - local ) );
		}
	}
	return d;
}

vec2 domainWarp21( vec2 p, float strength, float speed, float t ) {
	float s = max( strength, 0.0 );
	float qx = noise21( p * 1.8 + vec2( t * speed, 0.0 ) );
	float qy = noise21( p * 1.8 + vec2( 19.1, t * speed ) );
	vec2 warp = vec2( qx, qy ) * 2.0 - 1.0;
	return p + warp * s;
}

vec2 waterFlow2D( vec2 p, float scale, float speed, float t ) {
	float s = max( scale, 0.001 );
	float v = max( speed, 0.0 );
	vec2 q = p * s;
	float f1 = fbm21( q + vec2( t * v * 0.12, -t * v * 0.08 ) );
	float f2 = fbm21( q * 1.37 + vec2( -t * v * 0.09, t * v * 0.14 ) );
	vec2 drift = ( vec2( f1, f2 ) * 2.0 - 1.0 ) * 0.28;
	return p + drift;
}

float caustics2D( vec2 p, float scale, float speed, float choppy, float t ) {
	float s = max( scale, 0.001 );
	float v = max( speed, 0.0 );
	float c = clamp( choppy, 0.0, 4.0 );
	vec2 uv = p * s;
	vec2 drift = vec2(
		fbm21( uv * 0.7 + vec2( t * v * 0.13, 0.0 ) ),
		fbm21( uv * 0.9 + vec2( 0.0, -t * v * 0.16 ) )
	) * 2.0 - 1.0;
	uv += drift * ( 0.55 + c * 0.2 );
	float cellA = voronoi21( uv + vec2( t * v * 0.05, -t * v * 0.04 ), min( 1.25, 0.75 + c * 0.1 ) );
	float cellB = voronoi21( uv * 1.75 + vec2( -1.8, 2.2 ) + vec2( -t * v * 0.03, t * v * 0.07 ), min( 1.25, 0.65 + c * 0.12 ) );
	float edgeA = smoothstep( 0.24, 0.02, cellA );
	float edgeB = smoothstep( 0.2, 0.015, cellB );
	return sat01( edgeA * 0.72 + edgeB * 0.5 );
}

vec3 colorRamp3( float t, vec3 c0, vec3 c1, vec3 c2 ) {
	float x = sat01( t );
	if ( x < 0.5 ) {
		return mix( c0, c1, x * 2.0 );
	}
	return mix( c1, c2, ( x - 0.5 ) * 2.0 );
}

vec3 colorRamp5( float t, vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec3 c4 ) {
	float x = sat01( t ) * 4.0;
	if ( x < 1.0 ) return mix( c0, c1, x );
	if ( x < 2.0 ) return mix( c1, c2, x - 1.0 );
	if ( x < 3.0 ) return mix( c2, c3, x - 2.0 );
	return mix( c3, c4, x - 3.0 );
}

vec3 hueShift( vec3 color, float shift ) {
	const mat3 toYIQ = mat3(
		0.299, 0.587, 0.114,
		0.596, -0.274, -0.322,
		0.211, -0.523, 0.312
	);
	const mat3 toRGB = mat3(
		1.0, 0.956, 0.621,
		1.0, -0.272, -0.647,
		1.0, -1.106, 1.703
	);
	vec3 yiq = toYIQ * color;
	float hue = atan( yiq.z, yiq.y ) + shift;
	float chroma = length( yiq.yz );
	vec3 shifted = vec3( yiq.x, cos( hue ) * chroma, sin( hue ) * chroma );
	return clamp( toRGB * shifted, 0.0, 1.0 );
}

vec3 applyContrast( vec3 color, float amount ) {
	return clamp( ( color - 0.5 ) * amount + 0.5, 0.0, 1.0 );
}

vec3 applyPosterize( vec3 color, float steps ) {
	float count = max( steps, 1.0 );
	return floor( color * count ) / count;
}

float torusSdf( vec3 p, vec2 t ) {
	vec2 q = vec2( length( p.xz ) - t.x, p.y );
	return length( q ) - t.y;
}

vec3 torusNormal( vec3 p, vec2 t ) {
	const vec2 e = vec2( 0.001, 0.0 );
	float c = torusSdf( p, t );
	float dx = torusSdf( p + vec3( e.x, e.y, e.y ), t ) - c;
	float dy = torusSdf( p + vec3( e.y, e.x, e.y ), t ) - c;
	float dz = torusSdf( p + vec3( e.y, e.y, e.x ), t ) - c;
	return normalize( vec3( dx, dy, dz ) );
}

vec3 applyRigLighting( vec3 color, vec3 normal ) {
	vec3 n = normalize( normal );
	vec3 l = normalize( uRigLightDir );
	float lambert = max( dot( n, l ), 0.0 );
	float rim = pow( 1.0 - max( dot( n, vec3( 0.0, 0.0, 1.0 ) ), 0.0 ), 1.85 );
	float light = max( 0.0, uRigAmbient + lambert * uRigKey + rim * uRigRim );
	return color * light;
}

bool sampleStageSurface( vec2 fragUv, out vec2 outUv, out vec3 outNormal, out float outMask ) {
	vec2 centered = fragUv * 2.0 - 1.0;
	centered.x *= uResolution.x / max( uResolution.y, 1.0 );
	centered /= max( uStageZoom, 0.2 );

	float rot = uStageRotate;
	float c = cos( rot );
	float s = sin( rot );
	centered = mat2( c, -s, s, c ) * centered;

	if ( uPreviewStage < 0.5 ) {
		outUv = centered * 0.5 + 0.5;
		outNormal = vec3( 0.0, 0.0, 1.0 );
		outMask = step( abs( centered.x ), 1.0 ) * step( abs( centered.y ), 1.0 );
		return outMask > 0.001;
	}

	vec3 ro = vec3( 0.0, 0.0, 2.35 );
	vec3 rd = normalize( vec3( centered, -2.12 ) );

	if ( uPreviewStage < 1.5 ) {
		const float radius = 0.84;
		float b = dot( ro, rd );
		float cSphere = dot( ro, ro ) - radius * radius;
		float h = b * b - cSphere;
		if ( h < 0.0 ) {
			outMask = 0.0;
			return false;
		}
		float t = -b - sqrt( h );
		if ( t < 0.0 ) t = -b + sqrt( h );
		if ( t < 0.0 ) {
			outMask = 0.0;
			return false;
		}

		vec3 hit = ro + rd * t;
		vec3 n = normalize( hit );
		float u = atan( n.z, n.x ) / 6.28318530718 + 0.5;
		float v = n.y * 0.5 + 0.5;
		outUv = vec2( u, v );
		outNormal = n;
		outMask = 1.0;
		return true;
	}

	float t = 0.0;
	bool hitFound = false;
	vec3 hitPos = ro;
	const vec2 torusSize = vec2( 0.62, 0.24 );
	for ( int i = 0; i < 72; i ++ ) {
		hitPos = ro + rd * t;
		float d = torusSdf( hitPos, torusSize );
		if ( d < 0.0014 ) {
			hitFound = true;
			break;
		}
		t += d * 0.78;
		if ( t > 6.0 ) break;
	}

	if ( ! hitFound ) {
		outMask = 0.0;
		return false;
	}

	vec3 n = torusNormal( hitPos, torusSize );
	float major = atan( hitPos.z, hitPos.x ) / 6.28318530718 + 0.5;
	float minor = atan( hitPos.y, length( hitPos.xz ) - torusSize.x ) / 6.28318530718 + 0.5;
	outUv = vec2( major, minor );
	outNormal = n;
	outMask = 1.0;
	return true;
}
`;

const COMPOSITE_FRAGMENT_HEADER = `
precision highp float;

varying vec2 vUv;

uniform sampler2D uBaseTex;
uniform sampler2D uBloomTex;
uniform sampler2D uHistoryTex;
uniform float uFeedbackEnabled;
uniform vec2 uResolution;
uniform float uTime;
uniform float uOpacity;
uniform float uIntensity;
uniform vec3 uTint;

float sat01( float x ) {
	return clamp( x, 0.0, 1.0 );
}
`;

function numeric( value, fallback = 0 ) {

	const parsed = Number( value );
	if ( Number.isFinite( parsed ) ) return parsed;
	return fallback;

}

function floatLiteral( value, fallback = 0 ) {

	const parsed = numeric( value, fallback );
	if ( Number.isInteger( parsed ) ) return `${ parsed.toFixed( 1 ) }`;
	return String( parsed );

}

function vec2Literal( value, fallback = [ 0, 0 ] ) {

	const array = Array.isArray( value ) ? value : [ value?.x, value?.y ];
	const x = floatLiteral( array[ 0 ], fallback[ 0 ] );
	const y = floatLiteral( array[ 1 ], fallback[ 1 ] );
	return `vec2( ${ x }, ${ y } )`;

}

function vec3Literal( value, fallback = [ 0, 0, 0 ] ) {

	const array = Array.isArray( value ) ? value : [ value?.x, value?.y, value?.z ];
	const x = floatLiteral( array[ 0 ], fallback[ 0 ] );
	const y = floatLiteral( array[ 1 ], fallback[ 1 ] );
	const z = floatLiteral( array[ 2 ], fallback[ 2 ] );
	return `vec3( ${ x }, ${ y }, ${ z } )`;

}

function dynamicUniformName( nodeId, type ) {

	if ( type === 'vec3' ) return `uParamVec3_${ nodeId }`;
	if ( type === 'vec2' ) return `uParamVec2_${ nodeId }`;
	return `uParamFloat_${ nodeId }`;

}

function registerDynamicUniform( state, node, type, fallback ) {

	const nodeId = Number( node.id );
	const uniformName = dynamicUniformName( nodeId, type );
	if ( ! state.dynamicUniforms.has( uniformName ) ) {

		let value;
		if ( type === 'vec3' ) {

			value = [
				numeric( node.properties?.x, fallback[ 0 ] ),
				numeric( node.properties?.y, fallback[ 1 ] ),
				numeric( node.properties?.z, fallback[ 2 ] )
			];

		} else if ( type === 'vec2' ) {

			value = [
				numeric( node.properties?.x, fallback[ 0 ] ),
				numeric( node.properties?.y, fallback[ 1 ] )
			];

		} else {

			value = numeric( node.properties?.value, fallback );

		}

		state.dynamicUniforms.set( uniformName, {
			nodeId,
			type,
			uniformName,
			value
		} );

	}

	return { type, expr: uniformName };

}

function toFloat( value ) {

	if ( value.type === 'float' ) return value;
	if ( value.type === 'vec2' ) return { type: 'float', expr: `length( ${ value.expr } )` };
	if ( value.type === 'vec3' ) return { type: 'float', expr: `( ( ${ value.expr }.r + ${ value.expr }.g + ${ value.expr }.b ) / 3.0 )` };
	return { type: 'float', expr: '0.0' };

}

function toVec2( value ) {

	if ( value.type === 'vec2' ) return value;
	if ( value.type === 'float' ) return { type: 'vec2', expr: `vec2( ${ value.expr } )` };
	if ( value.type === 'vec3' ) return { type: 'vec2', expr: `${ value.expr }.xy` };
	return { type: 'vec2', expr: 'vec2( 0.0 )' };

}

function toVec3( value ) {

	if ( value.type === 'vec3' ) return value;
	if ( value.type === 'vec2' ) return { type: 'vec3', expr: `vec3( ${ value.expr }, 0.0 )` };
	if ( value.type === 'float' ) return { type: 'vec3', expr: `vec3( ${ value.expr } )` };
	return { type: 'vec3', expr: 'vec3( 0.0 )' };

}

function saturateAny( value ) {

	if ( value.type === 'vec2' ) return { type: 'vec2', expr: `clamp( ${ value.expr }, 0.0, 1.0 )` };
	if ( value.type === 'vec3' ) return { type: 'vec3', expr: `clamp( ${ value.expr }, 0.0, 1.0 )` };
	return { type: 'float', expr: `sat01( ${ toFloat( value ).expr } )` };

}

function promotePair( left, right ) {

	if ( left.type === 'vec3' || right.type === 'vec3' ) return [ toVec3( left ), toVec3( right ), 'vec3' ];
	if ( left.type === 'vec2' || right.type === 'vec2' ) return [ toVec2( left ), toVec2( right ), 'vec2' ];
	return [ toFloat( left ), toFloat( right ), 'float' ];

}

function normalizeGraph( graph ) {

	if ( ! graph || typeof graph !== 'object' ) throw new Error( 'Graph payload is missing.' );
	if ( ! Array.isArray( graph.nodes ) ) throw new Error( 'Graph must contain a nodes array.' );
	if ( graph.nodes.length === 0 ) throw new Error( 'Graph must contain at least one node.' );
	if ( graph.nodes.length > SHADER_NODE_LIMIT ) {

		throw new Error( `Graph node limit exceeded (${ graph.nodes.length } > ${ SHADER_NODE_LIMIT }).` );

	}

	const nodes = graph.nodes.map( ( node ) => {

		if ( ! node || typeof node !== 'object' ) throw new Error( 'Graph node is invalid.' );
		if ( node.id === undefined || node.id === null ) throw new Error( 'Graph node is missing id.' );
		if ( typeof node.type !== 'string' ) throw new Error( `Node ${ node.id } is missing type.` );
		if ( ! getNodeDefinition( node.type ) ) throw new Error( `Unsupported node type: ${ node.type }` );

		return {
			id: Number( node.id ),
			type: node.type,
			inputs: Array.isArray( node.inputs ) ? node.inputs : [],
			outputs: Array.isArray( node.outputs ) ? node.outputs : [],
			properties: node.properties && typeof node.properties === 'object' ? node.properties : {}
		};

	} );

	const links = Array.isArray( graph.links ) ? graph.links : [];
	const normalizedLinks = new Map();
	for ( const link of links ) {

		if ( ! Array.isArray( link ) || link.length < 5 ) continue;
		normalizedLinks.set( Number( link[ 0 ] ), [
			Number( link[ 0 ] ),
			Number( link[ 1 ] ),
			Number( link[ 2 ] ),
			Number( link[ 3 ] ),
			Number( link[ 4 ] ),
			link[ 5 ]
		] );

	}

	const nodeMap = new Map();
	for ( const node of nodes ) {

		if ( nodeMap.has( node.id ) ) throw new Error( `Duplicate node id: ${ node.id }` );
		nodeMap.set( node.id, node );

	}

	return { nodeMap, links: normalizedLinks };

}

function getInputValue( state, node, inputIndex, expectedType, fallbackValue ) {

	const nodeDefinition = SHADER_NODE_DEFINITIONS[ node.type ];
	const inputDefinition = nodeDefinition.inputs[ inputIndex ];
	const input = node.inputs?.[ inputIndex ];
	const linkedId = input?.link;

	if ( linkedId !== undefined && linkedId !== null ) {

		const link = state.links.get( Number( linkedId ) );
		if ( link ) {

			const originId = link[ 1 ];
			const originNode = state.nodeMap.get( originId );
			if ( originNode ) {

				return compileNode( state, originId );

			}

		}

	}

	let literal;
	if ( inputDefinition && inputDefinition.default !== undefined ) {

		literal = inputDefinition.default;

	} else if ( fallbackValue !== undefined ) {

		literal = fallbackValue;

	} else {

		literal = 0.0;

	}

	if ( expectedType === 'vec3' ) return { type: 'vec3', expr: vec3Literal( literal, [ 0, 0, 0 ] ) };
	if ( expectedType === 'vec2' ) return { type: 'vec2', expr: vec2Literal( literal, [ 0, 0 ] ) };
	if ( expectedType === 'float' ) return { type: 'float', expr: floatLiteral( literal, 0 ) };

	if ( Array.isArray( literal ) && literal.length >= 3 ) return { type: 'vec3', expr: vec3Literal( literal ) };
	if ( Array.isArray( literal ) && literal.length >= 2 ) return { type: 'vec2', expr: vec2Literal( literal ) };
	return { type: 'float', expr: floatLiteral( literal, 0 ) };

}

function compileNode( state, nodeId ) {

	if ( state.cache.has( nodeId ) ) return state.cache.get( nodeId );
	if ( state.visiting.has( nodeId ) ) throw new Error( `Cycle detected at node ${ nodeId }.` );

	const node = state.nodeMap.get( nodeId );
	if ( ! node ) throw new Error( `Node ${ nodeId } does not exist.` );

	state.visiting.add( nodeId );
	const type = node.type;
	let compiled;

	switch ( type ) {
		case 'input/uv':
			compiled = { type: 'vec2', expr: 'shaderUv' };
			break;
		case 'input/time':
			compiled = { type: 'float', expr: 'uTime' };
			break;
		case 'input/resolution':
			compiled = { type: 'vec2', expr: 'uResolution' };
			break;
		case 'input/mouse':
			compiled = { type: 'vec2', expr: 'uMouse' };
			break;
		case 'input/float':
			compiled = registerDynamicUniform( state, node, 'float', 0.5 );
			break;
		case 'input/vec2':
			compiled = registerDynamicUniform( state, node, 'vec2', [ 0.5, 0.5 ] );
			break;
		case 'input/vec3':
			compiled = registerDynamicUniform( state, node, 'vec3', [ 1.0, 0.5, 0.2 ] );
			break;
		case 'math/add': {
			const a = getInputValue( state, node, 0, 'dynamic', 0.0 );
			const b = getInputValue( state, node, 1, 'dynamic', 0.0 );
			const [ pa, pb, outputType ] = promotePair( a, b );
			compiled = { type: outputType, expr: `( ${ pa.expr } + ${ pb.expr } )` };
			break;
		}
		case 'math/sub': {
			const a = getInputValue( state, node, 0, 'dynamic', 0.0 );
			const b = getInputValue( state, node, 1, 'dynamic', 0.0 );
			const [ pa, pb, outputType ] = promotePair( a, b );
			compiled = { type: outputType, expr: `( ${ pa.expr } - ${ pb.expr } )` };
			break;
		}
		case 'math/mul': {
			const a = getInputValue( state, node, 0, 'dynamic', 1.0 );
			const b = getInputValue( state, node, 1, 'dynamic', 1.0 );
			const [ pa, pb, outputType ] = promotePair( a, b );
			compiled = { type: outputType, expr: `( ${ pa.expr } * ${ pb.expr } )` };
			break;
		}
		case 'math/div': {
			const a = getInputValue( state, node, 0, 'dynamic', 1.0 );
			const b = getInputValue( state, node, 1, 'dynamic', 1.0 );
			const [ pa, pb, outputType ] = promotePair( a, b );
			if ( outputType === 'vec3' ) {

				compiled = { type: 'vec3', expr: `( ${ pa.expr } / max( abs( ${ pb.expr } ), vec3( 0.0001 ) ) )` };

			} else if ( outputType === 'vec2' ) {

				compiled = { type: 'vec2', expr: `( ${ pa.expr } / max( abs( ${ pb.expr } ), vec2( 0.0001 ) ) )` };

			} else {

				compiled = { type: 'float', expr: `( ${ pa.expr } / max( abs( ${ pb.expr } ), 0.0001 ) )` };

			}
			break;
		}
		case 'math/mix': {
			const a = getInputValue( state, node, 0, 'dynamic', 0.0 );
			const b = getInputValue( state, node, 1, 'dynamic', 1.0 );
			const t = toFloat( getInputValue( state, node, 2, 'float', 0.5 ) );
			const [ pa, pb, outputType ] = promotePair( a, b );
			compiled = { type: outputType, expr: `mix( ${ pa.expr }, ${ pb.expr }, ${ t.expr } )` };
			break;
		}
		case 'math/clamp': {
			const x = getInputValue( state, node, 0, 'dynamic', 0.0 );
			const minValue = toFloat( getInputValue( state, node, 1, 'float', 0.0 ) );
			const maxValue = toFloat( getInputValue( state, node, 2, 'float', 1.0 ) );
			if ( x.type === 'vec3' ) {

				compiled = { type: 'vec3', expr: `clamp( ${ x.expr }, vec3( ${ minValue.expr } ), vec3( ${ maxValue.expr } ) )` };

			} else if ( x.type === 'vec2' ) {

				compiled = { type: 'vec2', expr: `clamp( ${ x.expr }, vec2( ${ minValue.expr } ), vec2( ${ maxValue.expr } ) )` };

			} else {

				compiled = { type: 'float', expr: `clamp( ${ toFloat( x ).expr }, ${ minValue.expr }, ${ maxValue.expr } )` };

			}
			break;
		}
		case 'math/smoothstep': {
			const edge0 = toFloat( getInputValue( state, node, 0, 'float', 0.2 ) );
			const edge1 = toFloat( getInputValue( state, node, 1, 'float', 0.8 ) );
			const x = getInputValue( state, node, 2, 'dynamic', 0.5 );
			if ( x.type === 'vec3' ) {

				compiled = { type: 'vec3', expr: `smoothstep( vec3( ${ edge0.expr } ), vec3( ${ edge1.expr } ), ${ x.expr } )` };

			} else if ( x.type === 'vec2' ) {

				compiled = { type: 'vec2', expr: `smoothstep( vec2( ${ edge0.expr } ), vec2( ${ edge1.expr } ), ${ x.expr } )` };

			} else {

				compiled = { type: 'float', expr: `smoothstep( ${ edge0.expr }, ${ edge1.expr }, ${ toFloat( x ).expr } )` };

			}
			break;
		}
		case 'math/pow': {
			const x = getInputValue( state, node, 0, 'dynamic', 0.5 );
			const exp = toFloat( getInputValue( state, node, 1, 'float', 2.0 ) );
			if ( x.type === 'vec3' ) {

				compiled = { type: 'vec3', expr: `pow( max( abs( ${ x.expr } ), vec3( 0.0001 ) ), vec3( ${ exp.expr } ) )` };

			} else if ( x.type === 'vec2' ) {

				compiled = { type: 'vec2', expr: `pow( max( abs( ${ x.expr } ), vec2( 0.0001 ) ), vec2( ${ exp.expr } ) )` };

			} else {

				compiled = { type: 'float', expr: `pow( max( abs( ${ toFloat( x ).expr } ), 0.0001 ), ${ exp.expr } )` };

			}
			break;
		}
		case 'math/sin':
		case 'math/cos':
		case 'math/abs': {
			const x = getInputValue( state, node, 0, 'dynamic', 0.0 );
			const fn = type === 'math/sin' ? 'sin' : type === 'math/cos' ? 'cos' : 'abs';
			compiled = { type: x.type, expr: `${ fn }( ${ x.expr } )` };
			break;
		}
		case 'math/length': {
			const x = getInputValue( state, node, 0, 'dynamic', 0.0 );
			compiled = { type: 'float', expr: `length( ${ x.expr } )` };
			break;
		}
		case 'advanced/math/remap': {
			const x = getInputValue( state, node, 0, 'dynamic', 0.5 );
			const inMin = toFloat( getInputValue( state, node, 1, 'float', 0.0 ) );
			const inMax = toFloat( getInputValue( state, node, 2, 'float', 1.0 ) );
			const outMin = toFloat( getInputValue( state, node, 3, 'float', 0.0 ) );
			const outMax = toFloat( getInputValue( state, node, 4, 'float', 1.0 ) );
			if ( x.type === 'vec3' ) {
				compiled = {
					type: 'vec3',
					expr: `vec3( remapSafe( ${ x.expr }.x, ${ inMin.expr }, ${ inMax.expr }, ${ outMin.expr }, ${ outMax.expr } ), remapSafe( ${ x.expr }.y, ${ inMin.expr }, ${ inMax.expr }, ${ outMin.expr }, ${ outMax.expr } ), remapSafe( ${ x.expr }.z, ${ inMin.expr }, ${ inMax.expr }, ${ outMin.expr }, ${ outMax.expr } ) )`
				};
			} else if ( x.type === 'vec2' ) {
				compiled = {
					type: 'vec2',
					expr: `vec2( remapSafe( ${ x.expr }.x, ${ inMin.expr }, ${ inMax.expr }, ${ outMin.expr }, ${ outMax.expr } ), remapSafe( ${ x.expr }.y, ${ inMin.expr }, ${ inMax.expr }, ${ outMin.expr }, ${ outMax.expr } ) )`
				};
			} else {
				compiled = { type: 'float', expr: `remapSafe( ${ toFloat( x ).expr }, ${ inMin.expr }, ${ inMax.expr }, ${ outMin.expr }, ${ outMax.expr } )` };
			}
			break;
		}
		case 'advanced/math/min':
		case 'advanced/math/max': {
			const a = getInputValue( state, node, 0, 'dynamic', 0.0 );
			const b = getInputValue( state, node, 1, 'dynamic', 1.0 );
			const [ pa, pb, outType ] = promotePair( a, b );
			const fn = type === 'advanced/math/min' ? 'min' : 'max';
			compiled = { type: outType, expr: `${ fn }( ${ pa.expr }, ${ pb.expr } )` };
			break;
		}
		case 'advanced/math/step': {
			const edge = toFloat( getInputValue( state, node, 0, 'float', 0.5 ) );
			const x = getInputValue( state, node, 1, 'dynamic', 0.5 );
			if ( x.type === 'vec3' ) {
				compiled = { type: 'vec3', expr: `step( vec3( ${ edge.expr } ), ${ x.expr } )` };
			} else if ( x.type === 'vec2' ) {
				compiled = { type: 'vec2', expr: `step( vec2( ${ edge.expr } ), ${ x.expr } )` };
			} else {
				compiled = { type: 'float', expr: `step( ${ edge.expr }, ${ toFloat( x ).expr } )` };
			}
			break;
		}
		case 'advanced/math/fract': {
			const x = getInputValue( state, node, 0, 'dynamic', 0.5 );
			compiled = { type: x.type, expr: `fract( ${ x.expr } )` };
			break;
		}
		case 'pattern/rotate2d': {
			const uv = toVec2( getInputValue( state, node, 0, 'vec2', [ 0.5, 0.5 ] ) );
			const angle = toFloat( getInputValue( state, node, 1, 'float', 0.0 ) );
			compiled = { type: 'vec2', expr: `rotate2D( ${ uv.expr }, ${ angle.expr } )` };
			break;
		}
		case 'pattern/polar': {
			const uv = toVec2( getInputValue( state, node, 0, 'vec2', [ 0.5, 0.5 ] ) );
			compiled = { type: 'vec2', expr: `toPolar( ${ uv.expr } )` };
			break;
		}
		case 'pattern/noise2d': {
			const p = toVec2( getInputValue( state, node, 0, 'vec2', [ 0.0, 0.0 ] ) );
			const scale = toFloat( getInputValue( state, node, 1, 'float', 1.0 ) );
			compiled = { type: 'float', expr: `noise21( ${ p.expr } * ${ scale.expr } )` };
			break;
		}
		case 'pattern/fbm': {
			const p = toVec2( getInputValue( state, node, 0, 'vec2', [ 0.0, 0.0 ] ) );
			const scale = toFloat( getInputValue( state, node, 1, 'float', 1.0 ) );
			compiled = { type: 'float', expr: `fbm21( ${ p.expr } * ${ scale.expr } )` };
			break;
		}
		case 'texture/samplea': {
			const uv = toVec2( getInputValue( state, node, 0, 'vec2', [ 0.5, 0.5 ] ) );
			const scale = toFloat( getInputValue( state, node, 1, 'float', 1.0 ) );
			compiled = {
				type: 'vec3',
				expr: `texture2D( uTexA, fract( ${ uv.expr } * max( ${ scale.expr }, 0.0001 ) ) ).rgb`
			};
			break;
		}
		case 'texture/sampleb': {
			const uv = toVec2( getInputValue( state, node, 0, 'vec2', [ 0.5, 0.5 ] ) );
			const scale = toFloat( getInputValue( state, node, 1, 'float', 1.0 ) );
			compiled = {
				type: 'vec3',
				expr: `texture2D( uTexB, fract( ${ uv.expr } * max( ${ scale.expr }, 0.0001 ) ) ).rgb`
			};
			break;
		}
		case 'advanced/pattern/voronoi2d': {
			const p = toVec2( getInputValue( state, node, 0, 'vec2', [ 0.0, 0.0 ] ) );
			const scale = toFloat( getInputValue( state, node, 1, 'float', 6.0 ) );
			const jitter = toFloat( getInputValue( state, node, 2, 'float', 1.0 ) );
			compiled = { type: 'float', expr: `voronoi21( ${ p.expr } * ${ scale.expr }, ${ jitter.expr } )` };
			break;
		}
		case 'advanced/pattern/domainwarp2d': {
			const p = toVec2( getInputValue( state, node, 0, 'vec2', [ 0.0, 0.0 ] ) );
			const strength = toFloat( getInputValue( state, node, 1, 'float', 0.25 ) );
			const speed = toFloat( getInputValue( state, node, 2, 'float', 1.0 ) );
			compiled = { type: 'vec2', expr: `domainWarp21( ${ p.expr }, ${ strength.expr }, ${ speed.expr }, uTime )` };
			break;
		}
		case 'advanced/pattern/ridgedfbm': {
			const p = toVec2( getInputValue( state, node, 0, 'vec2', [ 0.0, 0.0 ] ) );
			const scale = toFloat( getInputValue( state, node, 1, 'float', 1.0 ) );
			const gain = toFloat( getInputValue( state, node, 2, 'float', 0.65 ) );
			compiled = { type: 'float', expr: `ridgedFbm21( ${ p.expr } * ${ scale.expr }, ${ gain.expr } )` };
			break;
		}
		case 'advanced/pattern/waterflow2d': {
			const p = toVec2( getInputValue( state, node, 0, 'vec2', [ 0.0, 0.0 ] ) );
			const scale = toFloat( getInputValue( state, node, 1, 'float', 2.6 ) );
			const speed = toFloat( getInputValue( state, node, 2, 'float', 0.6 ) );
			compiled = { type: 'vec2', expr: `waterFlow2D( ${ p.expr }, ${ scale.expr }, ${ speed.expr }, uTime )` };
			break;
		}
		case 'advanced/pattern/caustics2d': {
			const p = toVec2( getInputValue( state, node, 0, 'vec2', [ 0.0, 0.0 ] ) );
			const scale = toFloat( getInputValue( state, node, 1, 'float', 5.8 ) );
			const speed = toFloat( getInputValue( state, node, 2, 'float', 0.55 ) );
			const choppy = toFloat( getInputValue( state, node, 3, 'float', 1.1 ) );
			compiled = { type: 'float', expr: `caustics2D( ${ p.expr }, ${ scale.expr }, ${ speed.expr }, ${ choppy.expr }, uTime )` };
			break;
		}
		case 'color/ramp3': {
			const t = toFloat( getInputValue( state, node, 0, 'float', 0.5 ) );
			const c0 = toVec3( getInputValue( state, node, 1, 'vec3', [ 0.12, 0.16, 0.32 ] ) );
			const c1 = toVec3( getInputValue( state, node, 2, 'vec3', [ 0.25, 0.55, 0.95 ] ) );
			const c2 = toVec3( getInputValue( state, node, 3, 'vec3', [ 1.0, 0.8, 0.35 ] ) );
			compiled = { type: 'vec3', expr: `colorRamp3( ${ t.expr }, ${ c0.expr }, ${ c1.expr }, ${ c2.expr } )` };
			break;
		}
		case 'advanced/color/gradient5': {
			const t = toFloat( getInputValue( state, node, 0, 'float', 0.5 ) );
			const c0 = toVec3( getInputValue( state, node, 1, 'vec3', [ 0.02, 0.04, 0.15 ] ) );
			const c1 = toVec3( getInputValue( state, node, 2, 'vec3', [ 0.11, 0.28, 0.62 ] ) );
			const c2 = toVec3( getInputValue( state, node, 3, 'vec3', [ 0.28, 0.64, 0.97 ] ) );
			const c3 = toVec3( getInputValue( state, node, 4, 'vec3', [ 0.85, 0.42, 0.96 ] ) );
			const c4 = toVec3( getInputValue( state, node, 5, 'vec3', [ 1.0, 0.88, 0.34 ] ) );
			compiled = { type: 'vec3', expr: `colorRamp5( ${ t.expr }, ${ c0.expr }, ${ c1.expr }, ${ c2.expr }, ${ c3.expr }, ${ c4.expr } )` };
			break;
		}
		case 'color/hueshift': {
			const color = toVec3( getInputValue( state, node, 0, 'vec3', [ 1.0, 0.6, 0.2 ] ) );
			const shift = toFloat( getInputValue( state, node, 1, 'float', 0.0 ) );
			compiled = { type: 'vec3', expr: `hueShift( ${ color.expr }, ${ shift.expr } )` };
			break;
		}
		case 'advanced/color/contrast': {
			const color = toVec3( getInputValue( state, node, 0, 'vec3', [ 0.5, 0.5, 0.5 ] ) );
			const amount = toFloat( getInputValue( state, node, 1, 'float', 1.2 ) );
			compiled = { type: 'vec3', expr: `applyContrast( ${ color.expr }, ${ amount.expr } )` };
			break;
		}
		case 'advanced/color/posterize': {
			const color = toVec3( getInputValue( state, node, 0, 'vec3', [ 1.0, 1.0, 1.0 ] ) );
			const steps = toFloat( getInputValue( state, node, 1, 'float', 5.0 ) );
			compiled = { type: 'vec3', expr: `applyPosterize( ${ color.expr }, ${ steps.expr } )` };
			break;
		}
		case 'color/saturate': {
			const x = getInputValue( state, node, 0, 'dynamic', 0.5 );
			compiled = saturateAny( x );
			break;
		}
		case 'postfx/bloom':
		case 'postfx/blur':
		case 'postfx/feedback':
		case 'postfx/vignette':
		case 'postfx/chromatic': {
			const amount = toFloat( getInputValue( state, node, 0, 'float', 0.5 ) );
			compiled = { type: 'float', expr: `sat01( ${ amount.expr } )` };
			break;
		}
		case 'output/color':
		case 'output/postfx':
			compiled = { type: 'void', expr: '' };
			break;
		default:
			throw new Error( `Unsupported node type: ${ type }` );
	}

	state.visiting.delete( nodeId );
	state.cache.set( nodeId, compiled );
	return compiled;

}

function findOutputColorNode( nodeMap ) {

	const outputs = Array.from( nodeMap.values() )
		.filter( ( node ) => node.type === 'output/color' )
		.sort( ( a, b ) => a.id - b.id );
	if ( outputs.length === 0 ) throw new Error( 'Graph requires one OutputColor node.' );
	return outputs[ 0 ];

}

function findPostFxNode( nodeMap ) {

	const nodes = Array.from( nodeMap.values() )
		.filter( ( node ) => node.type === 'output/postfx' )
		.sort( ( a, b ) => a.id - b.id );
	return nodes[ 0 ] || null;

}

function resolveStaticPostFxValue( state, node, inputIndex, fallback ) {

	const input = node.inputs?.[ inputIndex ];
	if ( ! input || input.link === null || input.link === undefined ) {

		const definition = SHADER_NODE_DEFINITIONS[ node.type ]?.inputs?.[ inputIndex ];
		return numeric( definition?.default, fallback );

	}

	const link = state.links.get( Number( input.link ) );
	if ( ! link ) return fallback;
	const sourceNode = state.nodeMap.get( Number( link[ 1 ] ) );
	if ( ! sourceNode ) return fallback;

	if ( sourceNode.type === 'input/float' ) {

		return numeric( sourceNode.properties?.value, fallback );

	}

	if ( sourceNode.type.startsWith( 'postfx/' ) ) {

		const sourceInput = sourceNode.inputs?.[ 0 ];
		if ( sourceInput && sourceInput.link !== null && sourceInput.link !== undefined ) return fallback;
		const sourceDefault = SHADER_NODE_DEFINITIONS[ sourceNode.type ]?.inputs?.[ 0 ]?.default;
		return numeric( sourceDefault, fallback );

	}

	return fallback;

}

function compilePostFx( state, postFxNode ) {

	const bloomExpr = toFloat( getInputValue( state, postFxNode, 0, 'float', 0.8 ) ).expr;
	const blurExpr = toFloat( getInputValue( state, postFxNode, 1, 'float', 0.45 ) ).expr;
	const feedbackExpr = toFloat( getInputValue( state, postFxNode, 2, 'float', 0.28 ) ).expr;
	const vignetteExpr = toFloat( getInputValue( state, postFxNode, 3, 'float', 0.36 ) ).expr;
	const chromaticExpr = toFloat( getInputValue( state, postFxNode, 4, 'float', 0.12 ) ).expr;

	const passConfig = {
		bloomAmount: resolveStaticPostFxValue( state, postFxNode, 0, 0.8 ),
		blurAmount: resolveStaticPostFxValue( state, postFxNode, 1, 0.45 ),
		feedbackAmount: resolveStaticPostFxValue( state, postFxNode, 2, 0.28 ),
		vignetteAmount: resolveStaticPostFxValue( state, postFxNode, 3, 0.36 ),
		chromaticAmount: resolveStaticPostFxValue( state, postFxNode, 4, 0.12 ),
		bloomThreshold: 0.52
	};

	return {
		expressions: {
			bloomExpr,
			blurExpr,
			feedbackExpr,
			vignetteExpr,
			chromaticExpr
		},
		passConfig
	};

}

function buildCompositeFragmentShader( expressions ) {

	return `${ COMPOSITE_FRAGMENT_HEADER }

void main() {
	vec2 uv = vUv;
	vec4 baseSample = texture2D( uBaseTex, uv );
	vec3 bloomSample = texture2D( uBloomTex, uv ).rgb;
	vec3 historySample = texture2D( uHistoryTex, uv ).rgb;

	float bloomAmount = clamp( ${ expressions.bloomExpr }, 0.0, 2.5 );
	float blurAmount = clamp( ${ expressions.blurExpr }, 0.0, 1.0 );
	float feedbackAmount = clamp( ${ expressions.feedbackExpr }, 0.0, 1.0 ) * uFeedbackEnabled;
	float vignetteAmount = clamp( ${ expressions.vignetteExpr }, 0.0, 1.5 );
	float chromaticAmount = clamp( ${ expressions.chromaticExpr }, 0.0, 1.0 );

	float pixelX = 1.0 / max( uResolution.x, 1.0 );
	vec2 chromaShift = vec2( pixelX * 10.0 * chromaticAmount, 0.0 );
	vec3 chromaColor;
	chromaColor.r = texture2D( uBaseTex, uv + chromaShift ).r;
	chromaColor.g = baseSample.g;
	chromaColor.b = texture2D( uBaseTex, uv - chromaShift ).b;

	vec3 color = baseSample.rgb;
	float bloomBoost = 0.35 + bloomAmount * 0.45;
	color += bloomSample * bloomBoost;
	color += bloomSample * blurAmount * 0.5;
	color = mix( color, max( chromaColor, color + bloomSample * 0.2 ), chromaticAmount * 0.65 );
	vec3 historyLift = max( historySample, historySample * 1.25 );
	color = mix( color, max( color, historyLift ), feedbackAmount * 0.6 );

	vec2 centered = uv - 0.5;
	float dist = length( centered ) * 1.4142;
	float vignette = 1.0 - pow( dist, 1.45 ) * vignetteAmount;
	color *= clamp( vignette, 0.25, 1.0 );

	float alpha = sat01( baseSample.a * 1.15 + dot( bloomSample, vec3( 0.3333 ) ) * 0.45 );
	color = mix( color, color * uTint, 0.2 );
	color *= max( uIntensity, 0.0 );
	alpha *= sat01( uOpacity );

	if ( alpha <= 0.001 ) discard;
	gl_FragColor = vec4( color, alpha );
}
`;

}

export function compileShaderGraph( graph, options = {} ) {

	const normalized = normalizeGraph( graph );
	const outputNode = findOutputColorNode( normalized.nodeMap );

	const state = {
		nodeMap: normalized.nodeMap,
		links: normalized.links,
		cache: new Map(),
		visiting: new Set(),
		dynamicUniforms: new Map()
	};

	const colorInput = getInputValue( state, outputNode, 0, 'vec3', [ 0.0, 0.0, 0.0 ] );
	const alphaInput = getInputValue( state, outputNode, 1, 'float', 0.0 );

	const colorExpr = toVec3( colorInput ).expr;
	const alphaExpr = toFloat( alphaInput ).expr;
	const dynamicUniforms = Array.from( state.dynamicUniforms.values() )
		.sort( ( a, b ) => a.nodeId - b.nodeId || a.uniformName.localeCompare( b.uniformName ) );
	const dynamicUniformDeclarations = dynamicUniforms.map( ( entry ) => {

		const uniformType = entry.type === 'vec3' ? 'vec3' : entry.type === 'vec2' ? 'vec2' : 'float';
		return `uniform ${ uniformType } ${ entry.uniformName };`;

	} ).join( '\n' );

	const baseFragmentShader = `${ BASE_FRAGMENT_HEADER }
${ dynamicUniformDeclarations }

void main() {
	vec2 baseUv = vec2( 0.0 );
	vec3 stageNormal = vec3( 0.0, 0.0, 1.0 );
	float stageMask = 0.0;
	bool stageHit = sampleStageSurface( vUv, baseUv, stageNormal, stageMask );
	if ( ! stageHit || stageMask <= 0.001 ) discard;

	float mode = floor( clamp( uShaderMode, 0.0, 2.0 ) + 0.5 );
	vec3 color = vec3( 0.0 );
	float alpha = 0.0;

	if ( mode < 1.5 ) {
		vec2 shaderUv = fract( baseUv );
		vec3 sampleColor = clamp( ${ colorExpr }, 0.0, 2.0 );
		float sampleAlpha = sat01( ${ alphaExpr } );
		if ( mode > 0.5 ) {
			sampleColor = applyRigLighting( sampleColor, stageNormal );
		}
		color = sampleColor;
		alpha = sampleAlpha * stageMask;
	} else {
		float steps = clamp( uVolumeSteps, 8.0, 36.0 );
		float density = max( 0.02, uVolumeDensity );
		float stretch = max( 0.1, uVolumeStretch );
		vec3 accumColor = vec3( 0.0 );
		float accumAlpha = 0.0;
		for ( int i = 0; i < 36; i ++ ) {
			if ( float( i ) >= steps || accumAlpha >= 0.985 ) break;
			float layer = float( i ) / max( steps - 1.0, 1.0 );
			vec2 flow = vec2(
				sin( uTime * 0.35 + layer * 6.28318530718 ),
				cos( uTime * 0.27 + layer * 5.4321 )
			) * 0.025;
			vec2 shaderUv = fract(
				baseUv +
				flow +
				stageNormal.xy * ( layer - 0.5 ) * 0.18 * stretch +
				vec2( 0.0, layer * 0.22 * stretch )
			);
			vec3 sampleColor = clamp( ${ colorExpr }, 0.0, 2.0 );
			float sampleAlpha = sat01( ${ alphaExpr } );
			float layerFade = ( 1.0 - layer * 0.68 );
			sampleAlpha *= density * layerFade / steps;
			accumColor += ( 1.0 - accumAlpha ) * sampleColor * sampleAlpha;
			accumAlpha += ( 1.0 - accumAlpha ) * sampleAlpha;
		}
		color = applyRigLighting( accumColor, stageNormal );
		alpha = accumAlpha * stageMask;
	}

	color = mix( color, color * uTint, 0.35 );
	color *= max( uIntensity, 0.0 );
	alpha *= sat01( uOpacity );
	if ( alpha <= 0.001 ) discard;
	gl_FragColor = vec4( color, alpha );
}
`;

	const postFxNode = findPostFxNode( normalized.nodeMap );
	const postFxCompiled = postFxNode
		? compilePostFx( state, postFxNode )
		: {
			expressions: {
				bloomExpr: '1.05',
				blurExpr: '0.36',
				feedbackExpr: '0.12',
				vignetteExpr: '0.2',
				chromaticExpr: '0.1'
			},
			passConfig: {
				bloomAmount: 1.05,
				blurAmount: 0.36,
				feedbackAmount: 0.12,
				vignetteAmount: 0.2,
				chromaticAmount: 0.1,
				bloomThreshold: 0.38
			}
		};

	const compositeFragmentShader = buildCompositeFragmentShader( postFxCompiled.expressions );
	const passConfig = {
		...postFxCompiled.passConfig,
		strictMode: options?.strictMode === true
	};

	const compiledPassSources = {
		baseVertexShader: VERTEX_SHADER,
		baseFragmentShader,
		compositeFragmentShader,
		postFxConfig: JSON.stringify( passConfig, null, 2 )
	};

	return {
		baseVertexShader: VERTEX_SHADER,
		baseFragmentShader,
		compositeFragmentShader,
		passConfig,
		compiledPassSources,
		uniformDefaults: {
			uTime: 0,
			uResolution: [ 1, 1 ],
			uMouse: [ 0.5, 0.5 ],
			uOpacity: 0.82,
			uIntensity: 1.0,
			uTint: [ 1.0, 1.0, 1.0 ],
			uShaderMode: 0.0,
			uPreviewStage: 0.0,
			uRigLightDir: [ - 0.4, 0.78, 0.46 ],
			uRigAmbient: 0.36,
			uRigKey: 0.94,
			uRigRim: 0.34,
			uStageZoom: 1.0,
			uStageRotate: 0.0,
			uVolumeDensity: 1.15,
			uVolumeSteps: 24.0,
			uVolumeStretch: 1.0,
			dynamicUniforms
		},
		// Backward compatibility for existing callers.
		vertexShader: VERTEX_SHADER,
		fragmentShader: baseFragmentShader
	};

}
