import * as THREE from 'three/webgl';

import { PRESET_META } from '../presets/PresetLibrary.js';
import { compileShaderGraph } from './ShaderGraphCompiler.js';
import { getDefaultShaderTemplate, getShaderBuilderTemplates, getShaderTemplate } from './ShaderGraphTemplates.js';
import { ShaderGraphStore } from './ShaderGraphStore.js';

const QUALITY_TIERS = [
	{ id: 0, label: 'light', renderScale: 0.7, blurIterations: 0, feedbackEnabled: false },
	{ id: 1, label: 'balanced', renderScale: 0.86, blurIterations: 1, feedbackEnabled: true },
	{ id: 2, label: 'full', renderScale: 1.0, blurIterations: 2, feedbackEnabled: true }
];

function deepClone( value ) {

	return JSON.parse( JSON.stringify( value ) );

}

function clampNumber( value, minValue, maxValue, fallback ) {

	const parsed = Number( value );
	if ( ! Number.isFinite( parsed ) ) return fallback;
	return Math.max( minValue, Math.min( maxValue, parsed ) );

}

function resolveColor( value, fallback = '#ffffff' ) {

	try {

		return new THREE.Color( value || fallback );

	} catch ( error ) {

		return new THREE.Color( fallback );

	}

}

function normalizeOceanProState( next = {}, current = {} ) {

	const deepColor = typeof next.deepColor === 'string' && next.deepColor.trim().length > 0
		? next.deepColor
		: ( current.deepColor || '#0a334f' );
	const shallowColor = typeof next.shallowColor === 'string' && next.shallowColor.trim().length > 0
		? next.shallowColor
		: ( current.shallowColor || '#6cd2d9' );

	return {
		waveScale: clampNumber( next.waveScale, 0.2, 12.0, current.waveScale ?? 2.9 ),
		causticScale: clampNumber( next.causticScale, 0.5, 20.0, current.causticScale ?? 5.8 ),
		choppy: clampNumber( next.choppy, 0.0, 4.0, current.choppy ?? 1.2 ),
		flowSpeed: clampNumber( next.flowSpeed, 0.05, 3.0, current.flowSpeed ?? 0.55 ),
		causticBoost: clampNumber( next.causticBoost, 0.2, 3.0, current.causticBoost ?? 1.28 ),
		night: typeof next.night === 'boolean' ? next.night : current.night === true,
		deepColor,
		shallowColor
	};

}

function normalizeFireProState( next = {}, current = {} ) {

	const coreColor = typeof next.coreColor === 'string' && next.coreColor.trim().length > 0
		? next.coreColor
		: ( current.coreColor || '#fff3cf' );
	const flameColor = typeof next.flameColor === 'string' && next.flameColor.trim().length > 0
		? next.flameColor
		: ( current.flameColor || '#ff6a1f' );
	const smokeColor = typeof next.smokeColor === 'string' && next.smokeColor.trim().length > 0
		? next.smokeColor
		: ( current.smokeColor || '#2d0f08' );

	return {
		noiseScale: clampNumber( next.noiseScale, 0.5, 8.0, current.noiseScale ?? 3.4 ),
		turbulence: clampNumber( next.turbulence, 0.0, 2.0, current.turbulence ?? 1.22 ),
		updraft: clampNumber( next.updraft, 0.1, 3.0, current.updraft ?? 1.75 ),
		glow: clampNumber( next.glow, 0.0, 2.0, current.glow ?? 1.35 ),
		sparkAmount: clampNumber( next.sparkAmount, 0.0, 2.0, current.sparkAmount ?? 0.74 ),
		coreColor,
		flameColor,
		smokeColor
	};

}

const SHADER_MODE_OPTIONS = [ 'screen', 'surface', 'volume' ];
const PREVIEW_STAGE_OPTIONS = [ 'plane', 'sphere', 'torus' ];

const LIGHTING_RIG_PRESETS = {
	studio: {
		ambient: 0.36,
		key: 0.94,
		rim: 0.34,
		lightDir: [ - 0.4, 0.78, 0.46 ]
	},
	sunset: {
		ambient: 0.31,
		key: 1.08,
		rim: 0.28,
		lightDir: [ - 0.82, 0.56, 0.12 ]
	},
	night: {
		ambient: 0.24,
		key: 0.72,
		rim: 0.46,
		lightDir: [ - 0.22, 0.92, - 0.31 ]
	},
	neon: {
		ambient: 0.42,
		key: 1.12,
		rim: 0.6,
		lightDir: [ 0.55, 0.66, 0.5 ]
	}
};

function resolveModeName( value, fallback = 'screen' ) {

	const candidate = typeof value === 'string' ? value.trim().toLowerCase() : '';
	if ( SHADER_MODE_OPTIONS.includes( candidate ) ) return candidate;
	return fallback;

}

function resolveStageName( value, fallback = 'plane' ) {

	const candidate = typeof value === 'string' ? value.trim().toLowerCase() : '';
	if ( PREVIEW_STAGE_OPTIONS.includes( candidate ) ) return candidate;
	return fallback;

}

function resolveRigPresetName( value, fallback = 'studio' ) {

	const candidate = typeof value === 'string' ? value.trim().toLowerCase() : '';
	if ( LIGHTING_RIG_PRESETS[ candidate ] ) return candidate;
	return fallback;

}

function modeIndex( mode ) {

	const index = SHADER_MODE_OPTIONS.indexOf( resolveModeName( mode ) );
	return index >= 0 ? index : 0;

}

function stageIndex( stage ) {

	const index = PREVIEW_STAGE_OPTIONS.indexOf( resolveStageName( stage ) );
	return index >= 0 ? index : 0;

}

function normalizePreviewState( next = {}, current = {} ) {

	const previous = current || {};
	const preset = resolveRigPresetName( next.lightingRig || previous.lightingRig || 'studio' );
	const presetDefaults = LIGHTING_RIG_PRESETS[ preset ] || LIGHTING_RIG_PRESETS.studio;

	const lightDirArray = Array.isArray( next.lightDir )
		? next.lightDir
		: ( Array.isArray( previous.lightDir ) ? previous.lightDir : presetDefaults.lightDir );

	return {
		shaderMode: resolveModeName( next.shaderMode, previous.shaderMode || 'screen' ),
		previewStage: resolveStageName( next.previewStage, previous.previewStage || 'plane' ),
		lightingRig: preset,
		ambient: clampNumber( next.ambient, 0.0, 2.0, previous.ambient ?? presetDefaults.ambient ),
		key: clampNumber( next.key, 0.0, 2.5, previous.key ?? presetDefaults.key ),
		rim: clampNumber( next.rim, 0.0, 2.0, previous.rim ?? presetDefaults.rim ),
		lightDir: [
			clampNumber( lightDirArray[ 0 ], - 2.0, 2.0, presetDefaults.lightDir[ 0 ] ),
			clampNumber( lightDirArray[ 1 ], - 2.0, 2.0, presetDefaults.lightDir[ 1 ] ),
			clampNumber( lightDirArray[ 2 ], - 2.0, 2.0, presetDefaults.lightDir[ 2 ] )
		],
		stageZoom: clampNumber( next.stageZoom, 0.3, 2.5, previous.stageZoom ?? 1.0 ),
		stageRotate: clampNumber( next.stageRotate, - 6.28318530718, 6.28318530718, previous.stageRotate ?? 0.0 ),
		volumeDensity: clampNumber( next.volumeDensity, 0.1, 3.0, previous.volumeDensity ?? 1.15 ),
		volumeSteps: clampNumber( next.volumeSteps, 8.0, 36.0, previous.volumeSteps ?? 24.0 ),
		volumeStretch: clampNumber( next.volumeStretch, 0.2, 3.0, previous.volumeStretch ?? 1.0 )
	};

}

function createDefaultTimelineState() {

	return {
		enabled: false,
		playing: false,
		loop: true,
		duration: 8.0,
		time: 0.0,
		tracks: {}
	};

}

function normalizeTimelineState( next = {}, current = createDefaultTimelineState(), dynamicParams = new Map() ) {

	const previous = current || createDefaultTimelineState();
	const tracks = {};
	const sourceTracks = next.tracks && typeof next.tracks === 'object' ? next.tracks : previous.tracks || {};

	for ( const [ nodeIdRaw, descriptor ] of dynamicParams.entries() ) {

		if ( descriptor.type !== 'float' ) continue;
		const nodeId = Number( nodeIdRaw );
		const source = sourceTracks[ nodeId ] || sourceTracks[ String( nodeId ) ] || {};
		const defaults = Array.isArray( source.values ) ? source.values : [ descriptor.value, descriptor.value, descriptor.value ];
		tracks[ nodeId ] = {
			enabled: source.enabled === true,
			values: [
				clampNumber( defaults[ 0 ], - 1000, 1000, descriptor.value ),
				clampNumber( defaults[ 1 ], - 1000, 1000, descriptor.value ),
				clampNumber( defaults[ 2 ], - 1000, 1000, descriptor.value )
			]
		};

	}

	return {
		enabled: next.enabled === true || ( next.enabled === undefined && previous.enabled === true ),
		playing: next.playing === true || ( next.playing === undefined && previous.playing === true ),
		loop: next.loop !== undefined ? next.loop === true : previous.loop !== false,
		duration: clampNumber( next.duration, 2.0, 60.0, previous.duration ?? 8.0 ),
		time: clampNumber( next.time, 0.0, 60.0, previous.time ?? 0.0 ),
		tracks
	};

}

function evaluateTimelineTrack( track, tNorm ) {

	if ( ! track || ! Array.isArray( track.values ) || track.values.length < 3 ) return 0;
	const t = Math.max( 0, Math.min( 1, tNorm ) );
	const v0 = Number( track.values[ 0 ] ) || 0;
	const v1 = Number( track.values[ 1 ] ) || 0;
	const v2 = Number( track.values[ 2 ] ) || 0;
	if ( t < 0.5 ) {

		const local = t * 2.0;
		return v0 + ( v1 - v0 ) * local;

	}
	const local = ( t - 0.5 ) * 2.0;
	return v1 + ( v2 - v1 ) * local;

}

function createSolidTexture( r, g, b, a = 255 ) {

	const data = new Uint8Array( [ r, g, b, a ] );
	const texture = new THREE.DataTexture( data, 1, 1, THREE.RGBAFormat );
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.needsUpdate = true;
	return texture;

}

function loadTextureFromFile( file ) {

	return new Promise( ( resolve, reject ) => {

		const objectUrl = URL.createObjectURL( file );
		const loader = new THREE.TextureLoader();
		loader.load(
			objectUrl,
			( texture ) => {

				URL.revokeObjectURL( objectUrl );
				texture.wrapS = THREE.RepeatWrapping;
				texture.wrapT = THREE.RepeatWrapping;
				texture.minFilter = THREE.LinearMipmapLinearFilter;
				texture.magFilter = THREE.LinearFilter;
				texture.needsUpdate = true;
				resolve( texture );

			},
			undefined,
			( error ) => {

				URL.revokeObjectURL( objectUrl );
				reject( error || new Error( 'Texture load failed.' ) );

			}
		);

	} );

}

function createRenderTarget( width, height ) {

	return new THREE.WebGLRenderTarget( Math.max( 2, width ), Math.max( 2, height ), {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBAFormat,
		type: THREE.UnsignedByteType,
		depthBuffer: false,
		stencilBuffer: false
	} );

}

function createFullscreenMaterial( fragmentShader, uniforms = {}, options = {} ) {

	const material = new THREE.ShaderMaterial( {
		name: options.name || 'ShaderBuilderFullscreenMaterial',
		vertexShader: `
			varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = vec4( position.xy, 0.0, 1.0 );
			}
		`,
		fragmentShader,
		uniforms,
		transparent: options.transparent !== false,
		depthWrite: false,
		depthTest: false,
		blending: options.blending || THREE.NormalBlending
	} );
	material.toneMapped = false;
	return material;

}

const BRIGHT_PASS_FRAGMENT = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uThreshold;
uniform float uStrength;
void main() {
	vec4 c = texture2D( uTexture, vUv );
	float lum = dot( c.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
	float m = smoothstep( uThreshold, uThreshold + 0.25, lum );
	gl_FragColor = vec4( c.rgb * m * max( uStrength, 0.0 ), m * c.a );
}
`;

const BLUR_PASS_FRAGMENT = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uDirection;
uniform float uRadius;
void main() {
	vec2 texel = uDirection / max( uResolution, vec2( 1.0 ) );
	float r = max( uRadius, 0.0 );
	vec3 color = vec3( 0.0 );
	float total = 0.0;
	for ( int i = -4; i <= 4; i ++ ) {
		float fi = float( i );
		float w = exp( -0.5 * ( fi * fi ) / max( 0.35 + r * 0.9, 0.2 ) );
		vec2 offset = texel * fi * ( 0.5 + r * 1.8 );
		color += texture2D( uTexture, vUv + offset ).rgb * w;
		total += w;
	}
	color /= max( total, 0.0001 );
	gl_FragColor = vec4( color, 1.0 );
}
`;

const COPY_FRAGMENT = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uOpacity;
void main() {
	vec4 c = texture2D( uTexture, vUv );
	gl_FragColor = vec4( c.rgb, c.a * clamp( uOpacity, 0.0, 1.0 ) );
}
`;

const OCEAN_PRO_FRAGMENT = `
precision highp float;
varying vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;
uniform float uOpacity;
uniform float uIntensity;
uniform vec3 uTint;
uniform vec3 uOceanDeep;
uniform vec3 uOceanShallow;
uniform float uWaveScale;
uniform float uCausticScale;
uniform float uChoppy;
uniform float uFlowSpeed;
uniform float uCausticBoost;
uniform float uNight;

const int NUM_STEPS = 6;
const int ITER_GEOMETRY = 2;
const int ITER_FRAGMENT = 5;
const float EPSILON = 0.001;
const float EPSILON_NRM = 0.35 / 1080.0;
mat2 octave_m = mat2( 1.7, 1.2, -1.2, 1.4 );

float hash( vec2 p ) {
	float h = dot( p, vec2( 127.1, 311.7 ) );
	return fract( sin( h ) * 43758.5453123 );
}

float noise( vec2 p ) {
	vec2 i = floor( p );
	vec2 f = fract( p );
	vec2 u = f * f * ( 3.0 - 2.0 * f );
	return -1.0 + 2.0 * mix(
		mix( hash( i + vec2( 0.0, 0.0 ) ), hash( i + vec2( 1.0, 0.0 ) ), u.x ),
		mix( hash( i + vec2( 0.0, 1.0 ) ), hash( i + vec2( 1.0, 1.0 ) ), u.x ),
		u.y
	);
}

float sea_octave( vec2 uv, float choppy ) {
	uv += noise( uv );
	vec2 wv = 1.0 - abs( sin( uv ) );
	vec2 swv = abs( cos( uv ) );
	wv = mix( wv, swv, wv );
	return pow( 1.0 - pow( wv.x * wv.y, 0.65 ), choppy );
}

float mapSea( vec3 p ) {
	float waveAmplitude = mix( 0.18, 1.35, clamp( uWaveScale / 10.0, 0.0, 1.0 ) );
	float waveFrequency = 0.07 + clamp( uCausticScale, 0.5, 20.0 ) * 0.02;
	float waveChoppy = 1.0 + clamp( uChoppy, 0.0, 4.0 ) * 1.25;
	float seaTime = uTime * ( 0.55 + uFlowSpeed * 1.7 );
	float freq = waveFrequency;
	float amp = waveAmplitude;
	float chop = waveChoppy;
	vec2 uv = p.xz;
	uv.x *= 0.75;
	float h = 0.0;
	for ( int i = 0; i < ITER_GEOMETRY; i ++ ) {
		float d = sea_octave( ( uv + seaTime ) * freq, chop );
		h += d * amp;
		uv *= octave_m;
		freq *= 1.92;
		amp *= 0.22;
		chop = mix( chop, 1.0, 0.2 );
	}
	return p.y - h;
}

float mapSeaDetailed( vec3 p ) {
	float waveAmplitude = mix( 0.18, 1.35, clamp( uWaveScale / 10.0, 0.0, 1.0 ) );
	float waveFrequency = 0.07 + clamp( uCausticScale, 0.5, 20.0 ) * 0.02;
	float waveChoppy = 1.0 + clamp( uChoppy, 0.0, 4.0 ) * 1.25;
	float seaTime = uTime * ( 0.55 + uFlowSpeed * 1.7 );
	float freq = waveFrequency;
	float amp = waveAmplitude;
	float chop = waveChoppy;
	vec2 uv = p.xz;
	uv.x *= 0.75;
	float h = 0.0;
	for ( int i = 0; i < ITER_FRAGMENT; i ++ ) {
		float d = sea_octave( ( uv + seaTime ) * freq, chop );
		d += sea_octave( ( uv - seaTime ) * freq, chop );
		h += d * amp;
		uv *= octave_m / 1.2;
		freq *= 1.9;
		amp *= 0.22;
		chop = mix( chop, 1.0, 0.2 );
	}
	return p.y - h;
}

float diffuse( vec3 n, vec3 l, float p ) {
	return pow( dot( n, l ) * 0.4 + 0.6, p );
}

float specular( vec3 n, vec3 l, vec3 e, float s ) {
	float nrm = ( s + 8.0 ) / ( 3.14159265 * 8.0 );
	return pow( max( dot( reflect( e, n ), l ), 0.0 ), s ) * nrm;
}

vec3 getSkyColor( vec3 e ) {
	e.y = max( e.y, 0.0 );
	return vec3(
		pow( 1.0 - e.y, 2.0 ),
		1.0 - e.y,
		0.6 + ( 1.0 - e.y ) * 0.4
	);
}

vec3 getNormal( vec3 p, float eps ) {
	vec3 n;
	n.y = mapSeaDetailed( p );
	n.x = mapSeaDetailed( vec3( p.x + eps, p.y, p.z ) ) - n.y;
	n.z = mapSeaDetailed( vec3( p.x, p.y, p.z + eps ) ) - n.y;
	n.y = eps;
	return normalize( n );
}

float heightMapTracing( vec3 ori, vec3 dir, out vec3 p ) {
	float tm = 0.0;
	float tx = 1000.0;
	float hx = mapSea( ori + dir * tx );
	if ( hx > 0.0 ) {
		p = ori + dir * tx;
		return tx;
	}
	float hm = mapSea( ori + dir * tm );
	float tmid = 0.0;
	for ( int i = 0; i < NUM_STEPS; i ++ ) {
		tmid = mix( tm, tx, hm / ( hm - hx ) );
		p = ori + dir * tmid;
		float hmid = mapSea( p );
		if ( hmid < 0.0 ) {
			tx = tmid;
			hx = hmid;
		} else {
			tm = tmid;
			hm = hmid;
		}
	}
	p = ori + dir * tmid;
	return tmid;
}

void main() {
	vec2 uv = vUv * 2.0 - 1.0;
	uv.x *= uResolution.x / max( uResolution.y, 1.0 );

	vec3 ori = vec3( 0.0, 3.1, uTime * ( 0.35 + uFlowSpeed * 0.32 ) );
	vec3 dir = normalize( vec3( uv.xy, -1.7 ) );
	dir.z += length( uv ) * 0.08;
	dir = normalize( dir );

	vec3 p = ori + dir * 120.0;
	float distT = heightMapTracing( ori, dir, p );
	vec3 skyColor = getSkyColor( dir );

	// Ray misses ocean surface: render cinematic sky fallback instead of undefined data.
	if ( distT >= 999.0 ) {
		vec3 sky = pow( max( skyColor, vec3( 0.0 ) ), vec3( 0.88 ) );
		sky = mix( sky, sky * uTint, 0.18 );
		sky *= max( 0.45, uIntensity * 0.72 );
		gl_FragColor = vec4( sky, clamp( uOpacity * 0.92, 0.0, 1.0 ) );
		return;
	}

	vec3 dist = p - ori;
	vec3 n = getNormal( p, dot( dist, dist ) * EPSILON_NRM + EPSILON );
	vec3 light = normalize( vec3( 0.0, 1.0, 0.8 ) );
	float fresnel = pow( 1.0 - max( dot( n, -dir ), 0.0 ), 3.0 ) * 0.45;
	vec3 reflected = getSkyColor( reflect( dir, n ) );
	vec3 refracted = mix( uOceanDeep, uOceanShallow, diffuse( n, light, 80.0 ) * 0.55 + 0.25 );
	vec3 seaColor = mix( refracted, reflected, fresnel );

	float atten = max( 1.0 - dot( dist, dist ) * 0.001, 0.0 );
	seaColor += uOceanShallow * ( p.y - 0.15 ) * 0.12 * atten;
	seaColor += vec3( specular( n, light, dir, 90.0 ) ) * ( 0.35 + uCausticBoost * 0.15 );

	seaColor /= sqrt( sqrt( max( length( dist ), 0.0001 ) ) );
	if ( uNight > 0.5 ) {
		seaColor *= seaColor * 7.0;
		skyColor *= 0.58;
	} else {
		seaColor *= sqrt( sqrt( max( seaColor, vec3( 0.0001 ) ) ) ) * 3.9;
		skyColor = skyColor * 1.04 - 0.02;
	}

	vec3 color = mix(
		skyColor,
		seaColor,
		pow( smoothstep( 0.0, -0.05, dir.y ), 0.32 )
	);

	color = pow( max( color, vec3( 0.0 ) ), vec3( 0.82 ) );
	color = mix( color, color * uTint, 0.18 );
	color *= max( uIntensity, 0.0 );

	float alpha = clamp( uOpacity * ( distT < 999.0 ? 1.0 : 0.82 ), 0.0, 1.0 );
	gl_FragColor = vec4( color, alpha );
}
`;

const FIRE_PRO_FRAGMENT = `
precision highp float;
varying vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;
uniform float uOpacity;
uniform float uIntensity;
uniform vec3 uTint;

uniform float uNoiseScale;
uniform float uTurbulence;
uniform float uUpdraft;
uniform float uGlow;
uniform float uSparkAmount;
uniform vec3 uCoreColor;
uniform vec3 uFlameColor;
uniform vec3 uSmokeColor;

#define FIRE_STEPS 64

float sat01( float x ) {
	return clamp( x, 0.0, 1.0 );
}

vec2 rotate2D( vec2 p, float a ) {
	float s = sin( a );
	float c = cos( a );
	return mat2( c, - s, s, c ) * p;
}

float hash13( vec3 p ) {
	p = fract( p * vec3( 0.1031, 0.1030, 0.0973 ) );
	p += dot( p, p.yxz + 19.19 );
	return fract( ( p.x + p.y ) * p.z );
}

float noise3D( vec3 p ) {
	vec3 i = floor( p );
	vec3 f = fract( p );
	f = f * f * ( 3.0 - 2.0 * f );

	float n000 = hash13( i + vec3( 0.0, 0.0, 0.0 ) );
	float n100 = hash13( i + vec3( 1.0, 0.0, 0.0 ) );
	float n010 = hash13( i + vec3( 0.0, 1.0, 0.0 ) );
	float n110 = hash13( i + vec3( 1.0, 1.0, 0.0 ) );
	float n001 = hash13( i + vec3( 0.0, 0.0, 1.0 ) );
	float n101 = hash13( i + vec3( 1.0, 0.0, 1.0 ) );
	float n011 = hash13( i + vec3( 0.0, 1.0, 1.0 ) );
	float n111 = hash13( i + vec3( 1.0, 1.0, 1.0 ) );

	float n00 = mix( n000, n100, f.x );
	float n01 = mix( n001, n101, f.x );
	float n10 = mix( n010, n110, f.x );
	float n11 = mix( n011, n111, f.x );
	float n0 = mix( n00, n10, f.y );
	float n1 = mix( n01, n11, f.y );
	return mix( n0, n1, f.z );
}

float fbm3D( vec3 p ) {
	float total = 0.0;
	float amp = 0.5;
	float freq = 1.0;
	for ( int i = 0; i < 5; i ++ ) {
		total += noise3D( p * freq ) * amp;
		freq *= 2.0;
		amp *= 0.52;
	}
	return total;
}

float flameShape( vec3 p ) {
	float yNorm = sat01( ( p.y + 0.1 ) / 1.7 );
	float taper = mix( 0.68, 0.1, yNorm );
	float radial = length( p.xz );
	float body = 1.0 - smoothstep( taper, taper + 0.18, radial );
	float foot = smoothstep( - 0.32, - 0.04, p.y );
	float cap = smoothstep( 1.82, 1.26, p.y );
	return body * foot * cap;
}

float sparkMask( vec3 p, float t ) {
	vec3 grid = floor( vec3( p.x * 34.0, p.y * 42.0 - t * ( 5.5 + uUpdraft * 3.8 ), p.z * 34.0 ) );
	float rnd = hash13( grid + vec3( 17.0, 29.0, 47.0 ) );
	float band = smoothstep( 0.02, 0.85, p.y ) * smoothstep( 1.85, 0.35, p.y );
	return step( 0.986 - uSparkAmount * 0.09, rnd ) * band;
}

float flameDensity( vec3 p, float t, out float coreMask, out float smokeMask ) {
	float noiseScale = max( uNoiseScale, 0.2 );
	float turbulence = clamp( uTurbulence, 0.0, 2.0 );
	float updraft = clamp( uUpdraft, 0.1, 3.0 );

	vec3 q = p;
	q.y += t * ( 0.95 + updraft * 1.15 );
	float spin = sin( q.y * 5.4 + t * 3.6 ) * 0.24 + sin( q.y * 8.1 - t * 4.9 ) * 0.08;
	q.xz = rotate2D( q.xz, spin * ( 0.45 + turbulence * 0.6 ) );
	q.x += ( fbm3D( vec3( q.x * 1.9, q.y * 1.05 - t * 1.4, q.z * 1.9 ) ) - 0.5 ) * 0.46 * turbulence;
	q.z += ( fbm3D( vec3( q.z * 1.7 - 4.2, q.y * 1.16 - t * 1.8, q.x * 1.7 + 2.4 ) ) - 0.5 ) * 0.41 * turbulence;

	float shape = flameShape( p );
	float low = fbm3D( vec3( q.x * noiseScale * 0.95, q.y * noiseScale * 1.35 - t * 1.9, q.z * noiseScale * 0.95 ) );
	float mid = fbm3D( vec3( q.x * noiseScale * 1.75 + 12.7, q.y * noiseScale * 2.3 - t * 2.8, q.z * noiseScale * 1.75 - 8.1 ) );
	float high = noise3D( vec3( q.x * noiseScale * 3.7 - 19.3, q.y * noiseScale * 4.3 - t * 4.6, q.z * noiseScale * 3.7 + 6.2 ) );
	float detail = low * 0.54 + mid * 0.34 + high * 0.2;

	float yLift = 1.0 - sat01( p.y / 1.7 );
	float density = smoothstep( 0.28, 0.95, detail + yLift * 0.36 );
	density *= shape;
	density *= 0.52 + yLift * 1.08;

	float radialCore = 1.0 - smoothstep( 0.0, 0.34, length( p.xz ) );
	coreMask = sat01( shape * radialCore * smoothstep( 0.5, 1.0, detail + yLift * 0.35 ) );
	smokeMask = sat01( shape * smoothstep( 0.45, 1.0, p.y / 1.7 ) * ( 0.35 + ( 1.0 - detail ) * 0.65 ) );

	return sat01( density * 1.4 );
}

void main() {
	vec2 uv = vUv * 2.0 - 1.0;
	float aspect = uResolution.x / max( uResolution.y, 1.0 );
	uv.x *= aspect;

	vec3 rayOrigin = vec3( 0.0, 0.24, 2.62 );
	vec3 rayDir = normalize( vec3( uv.x, uv.y * 0.92, - 2.08 ) );

	float t = uTime;
	float stepLen = 0.052;
	float rayT = 0.26;
	vec3 accumColor = vec3( 0.0 );
	float accumAlpha = 0.0;
	float glowAccum = 0.0;
	float sparkAccum = 0.0;

	for ( int i = 0; i < FIRE_STEPS; i ++ ) {
		if ( accumAlpha > 0.985 ) break;

		vec3 p = rayOrigin + rayDir * rayT;
		rayT += stepLen;

		if ( p.y < - 0.36 || p.y > 1.92 || abs( p.x ) > 1.22 || abs( p.z ) > 1.22 ) continue;

		float coreMask = 0.0;
		float smokeMask = 0.0;
		float density = flameDensity( p, t, coreMask, smokeMask );
		if ( density < 0.002 ) continue;

		float yNorm = sat01( p.y / 1.75 );
		vec3 flameColor = mix( uFlameColor, uCoreColor, coreMask );
		vec3 smokeColor = mix( uSmokeColor, uFlameColor * 0.36, 0.24 );
		vec3 sampleColor = mix( smokeColor, flameColor, sat01( density + coreMask * 0.75 ) );
		sampleColor += uCoreColor * coreMask * ( 0.62 + uGlow * 0.72 );
		sampleColor = mix( sampleColor, smokeColor, smokeMask * 0.45 * yNorm );

		float sampleAlpha = density * ( 0.13 + ( 1.0 - yNorm ) * 0.24 );
		sampleAlpha += coreMask * 0.19;
		sampleAlpha = sat01( sampleAlpha );

		accumColor += ( 1.0 - accumAlpha ) * sampleColor * sampleAlpha;
		accumAlpha += ( 1.0 - accumAlpha ) * sampleAlpha;
		glowAccum += sampleAlpha * ( 0.3 + coreMask * 0.82 + density * 0.21 );

		float spark = sparkMask( p, t );
		sparkAccum += spark * ( 0.018 + uSparkAmount * 0.08 );
	}

	vec3 sparkColor = vec3( 1.0, 0.9, 0.62 );
	accumColor += sparkColor * sparkAccum * ( 0.82 + uSparkAmount * 0.72 );

	float glow = glowAccum / float( FIRE_STEPS );
	accumColor += mix( uFlameColor, uCoreColor, 0.58 ) * pow( glow, 1.12 ) * ( 0.24 + uGlow * 0.98 );

	float edgeVignette = smoothstep( 1.2, 0.12, length( uv ) );
	accumColor *= mix( 0.86, 1.0, edgeVignette );

	accumColor = max( accumColor, vec3( 0.0 ) );
	accumColor = pow( accumColor, vec3( 0.87 ) );
	accumColor = mix( accumColor, accumColor * uTint, 0.2 );
	accumColor *= max( uIntensity, 0.0 );

	float outAlpha = clamp( accumAlpha * uOpacity + sparkAccum * 0.36, 0.0, 1.0 );
	if ( outAlpha <= 0.002 ) discard;
	gl_FragColor = vec4( accumColor, outAlpha );
}
`;

export class WebGLShaderBuilderSystem {

	constructor( scene, options = {} ) {

		this.scene = scene;
		this.maxSavedGraphs = Number.isFinite( options.maxSavedGraphs ) ? Math.max( 1, Math.floor( options.maxSavedGraphs ) ) : 30;
		this.store = new ShaderGraphStore( { maxItems: this.maxSavedGraphs } );

		this.overlayScene = new THREE.Scene();
		this.overlayCamera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
		this.overlayQuadGeometry = new THREE.PlaneGeometry( 2, 2 );
		this.overlayMesh = new THREE.Mesh( this.overlayQuadGeometry, new THREE.MeshBasicMaterial( { transparent: true, opacity: 0 } ) );
		this.overlayMesh.frustumCulled = false;
		this.overlayScene.add( this.overlayMesh );

		this.fullscreenScene = new THREE.Scene();
		this.fullscreenCamera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
		this.fullscreenQuad = new THREE.Mesh( this.overlayQuadGeometry, new THREE.MeshBasicMaterial() );
		this.fullscreenQuad.frustumCulled = false;
		this.fullscreenScene.add( this.fullscreenQuad );

		this.brightPassMaterial = createFullscreenMaterial( BRIGHT_PASS_FRAGMENT, {
			uTexture: { value: null },
			uThreshold: { value: 0.38 },
			uStrength: { value: 1.05 }
		}, { name: 'ShaderBuilderBrightPass' } );

		this.blurPassMaterial = createFullscreenMaterial( BLUR_PASS_FRAGMENT, {
			uTexture: { value: null },
			uResolution: { value: new THREE.Vector2( 1, 1 ) },
			uDirection: { value: new THREE.Vector2( 1, 0 ) },
			uRadius: { value: 1.0 }
		}, { name: 'ShaderBuilderBlurPass' } );

		this.copyPassMaterial = createFullscreenMaterial( COPY_FRAGMENT, {
			uTexture: { value: null },
			uOpacity: { value: 1.0 }
		}, {
			name: 'ShaderBuilderCopyPass',
			transparent: false,
			blending: THREE.NormalBlending
		} );

		this.screenPassMaterial = createFullscreenMaterial( COPY_FRAGMENT, {
			uTexture: { value: null },
			uOpacity: { value: 1.0 }
		}, {
			name: 'ShaderBuilderScreenPass',
			transparent: true,
			blending: THREE.AdditiveBlending
		} );

		this.material = null;
		this.baseMaterial = null;
		this.baseUniforms = null;
		this.oceanProUniforms = null;
		this.fireProUniforms = null;
		this.compositeMaterial = null;
		this.compositeUniforms = null;
		this.activeRenderMode = 'graph';
		this.time = 0;
		this.enabled = false;
		this.activePreset = null;
		this.activeTemplateId = null;
		this.activeTemplateTier = 'basic';
		this.activeSavedGraphId = this.store.getActiveGraphId();
		this.activeGraph = null;
		this.lastError = null;
		this.lastCompileAt = null;
		this.lastCompiledVertexShader = '';
		this.lastCompiledFragmentShader = '';
		this.compiledPassSources = null;
		this.passConfig = {
			bloomAmount: 1.05,
			blurAmount: 0.36,
			feedbackAmount: 0.12,
			vignetteAmount: 0.2,
			chromaticAmount: 0.1,
			bloomThreshold: 0.38
		};

		this.postFxState = { ...this.passConfig };
		this.mouse = new THREE.Vector2( 0.5, 0.5 );

		this.params = {
			overlayOpacity: 0.82,
			overlayIntensity: 1.0,
			tintColor: '#ffffff'
		};
		this.oceanProState = normalizeOceanProState();
		this.fireProState = normalizeFireProState();
		this.previewState = normalizePreviewState();
		this.dynamicParamState = new Map();
		this.exposedParamIds = [];
		this.timelineState = createDefaultTimelineState();
		this.defaultTextureA = createSolidTexture( 255, 255, 255, 255 );
		this.defaultTextureB = createSolidTexture( 110, 130, 170, 255 );
		this.textureSlots = {
			a: { texture: this.defaultTextureA, name: 'Default White' },
			b: { texture: this.defaultTextureB, name: 'Default Cool' }
		};

		this.qualityTier = 1;
		this.lowFpsDuration = 0;
		this.highFpsDuration = 0;
		this.passStats = {
			qualityTier: this.qualityTier,
			qualityLabel: QUALITY_TIERS[ this.qualityTier ].label,
			passCount: 0,
			renderScale: QUALITY_TIERS[ this.qualityTier ].renderScale,
			lastRenderWidth: 0,
			lastRenderHeight: 0,
			feedbackEnabled: true
		};

		this.rtA = null;
		this.rtB = null;
		this.rtC = null;
		this.rtFinal = null;
		this.rtHistory = null;
		this.rtWidth = 0;
		this.rtHeight = 0;
		this.historyInitialized = false;

		this._onPointerMove = ( event ) => {

			if ( ! event || ! event.currentTarget ) return;
			const rect = event.currentTarget.getBoundingClientRect?.();
			if ( ! rect || rect.width <= 0 || rect.height <= 0 ) return;
			const x = ( event.clientX - rect.left ) / rect.width;
			const y = ( event.clientY - rect.top ) / rect.height;
			this.mouse.set( Math.max( 0, Math.min( 1, x ) ), Math.max( 0, Math.min( 1, 1 - y ) ) );

		};

		const defaultTemplate = getDefaultShaderTemplate();
		if ( defaultTemplate ) {

			this.applyTemplate( defaultTemplate.id );

		}

	}

	bindCanvas( canvas ) {

		if ( this.boundCanvas === canvas ) return;
		if ( this.boundCanvas ) {

			this.boundCanvas.removeEventListener( 'pointermove', this._onPointerMove );

		}

		this.boundCanvas = canvas || null;
		if ( this.boundCanvas ) {

			this.boundCanvas.addEventListener( 'pointermove', this._onPointerMove );

		}

	}

	setQualityTier( tier ) {

		const next = Math.max( 0, Math.min( QUALITY_TIERS.length - 1, Math.floor( Number( tier ) || 0 ) ) );
		this.qualityTier = next;
		this.passStats.qualityTier = next;
		this.passStats.qualityLabel = QUALITY_TIERS[ next ].label;
		this.passStats.renderScale = QUALITY_TIERS[ next ].renderScale;

	}

	getQualityTier() {

		return this.qualityTier;

	}

	getPassStats() {

		return { ...this.passStats };

	}

	_getTierConfig() {

		return QUALITY_TIERS[ this.qualityTier ] || QUALITY_TIERS[ 1 ];

	}

	_updateAdaptiveQuality( delta ) {

		if ( ! Number.isFinite( delta ) || delta <= 0 ) return;
		const fps = 1 / delta;

		if ( fps < 56 ) this.lowFpsDuration += delta;
		else this.lowFpsDuration = 0;

		if ( fps > 62 ) this.highFpsDuration += delta;
		else this.highFpsDuration = 0;

		if ( this.lowFpsDuration >= 1.0 && this.qualityTier > 0 ) {

			this.setQualityTier( this.qualityTier - 1 );
			this.lowFpsDuration = 0;
			this.highFpsDuration = 0;

		} else if ( this.highFpsDuration >= 3.0 && this.qualityTier < 2 ) {

			this.setQualityTier( this.qualityTier + 1 );
			this.lowFpsDuration = 0;
			this.highFpsDuration = 0;

		}

	}

	_createGraphMaterials( graph ) {

		const compiled = compileShaderGraph( graph, { strictMode: false } );
		const tint = resolveColor( this.params.tintColor );
		const dynamicUniformDefs = Array.isArray( compiled?.uniformDefaults?.dynamicUniforms )
			? compiled.uniformDefaults.dynamicUniforms
			: [];

		const baseUniforms = {
			uTime: { value: this.time },
			uResolution: { value: new THREE.Vector2( 1, 1 ) },
			uMouse: { value: this.mouse.clone() },
			uOpacity: { value: this.params.overlayOpacity },
			uIntensity: { value: this.params.overlayIntensity },
			uTint: { value: tint.clone() },
			uTexA: { value: this.textureSlots.a.texture },
			uTexB: { value: this.textureSlots.b.texture },
			uShaderMode: { value: modeIndex( this.previewState.shaderMode ) },
			uPreviewStage: { value: stageIndex( this.previewState.previewStage ) },
			uRigLightDir: { value: new THREE.Vector3().fromArray( this.previewState.lightDir ) },
			uRigAmbient: { value: this.previewState.ambient },
			uRigKey: { value: this.previewState.key },
			uRigRim: { value: this.previewState.rim },
			uStageZoom: { value: this.previewState.stageZoom },
			uStageRotate: { value: this.previewState.stageRotate },
			uVolumeDensity: { value: this.previewState.volumeDensity },
			uVolumeSteps: { value: this.previewState.volumeSteps },
			uVolumeStretch: { value: this.previewState.volumeStretch }
		};
		const dynamicParamState = new Map();
		for ( const descriptor of dynamicUniformDefs ) {

			if ( ! descriptor || typeof descriptor.uniformName !== 'string' ) continue;
			if ( descriptor.type === 'vec3' ) {

				const source = Array.isArray( descriptor.value ) ? descriptor.value : [ 0, 0, 0 ];
				baseUniforms[ descriptor.uniformName ] = {
					value: new THREE.Vector3(
						Number( source[ 0 ] ) || 0,
						Number( source[ 1 ] ) || 0,
						Number( source[ 2 ] ) || 0
					)
				};

			} else if ( descriptor.type === 'vec2' ) {

				const source = Array.isArray( descriptor.value ) ? descriptor.value : [ 0, 0 ];
				baseUniforms[ descriptor.uniformName ] = {
					value: new THREE.Vector2(
						Number( source[ 0 ] ) || 0,
						Number( source[ 1 ] ) || 0
					)
				};

			} else {

				baseUniforms[ descriptor.uniformName ] = { value: Number( descriptor.value ) || 0 };

			}

			dynamicParamState.set( Number( descriptor.nodeId ), {
				nodeId: Number( descriptor.nodeId ),
				type: descriptor.type || 'float',
				uniformName: descriptor.uniformName,
				value: Array.isArray( descriptor.value ) ? descriptor.value.slice() : Number( descriptor.value ) || 0
			} );

		}

		const baseMaterial = new THREE.ShaderMaterial( {
			name: 'ShaderBuilderBaseMaterial',
			vertexShader: compiled.baseVertexShader || compiled.vertexShader,
			fragmentShader: compiled.baseFragmentShader || compiled.fragmentShader,
			uniforms: baseUniforms,
			transparent: true,
			depthWrite: false,
			depthTest: false,
			blending: THREE.AdditiveBlending
		} );
		baseMaterial.toneMapped = false;

		const compositeUniforms = {
			uBaseTex: { value: null },
			uBloomTex: { value: null },
			uHistoryTex: { value: null },
			uFeedbackEnabled: { value: 1.0 },
			uResolution: { value: new THREE.Vector2( 1, 1 ) },
			uTime: { value: this.time },
			uOpacity: { value: this.params.overlayOpacity },
			uIntensity: { value: this.params.overlayIntensity },
			uTint: { value: tint.clone() }
		};

		const compositeMaterial = new THREE.ShaderMaterial( {
			name: 'ShaderBuilderCompositeMaterial',
			vertexShader: compiled.baseVertexShader || compiled.vertexShader,
			fragmentShader: compiled.compositeFragmentShader,
			uniforms: compositeUniforms,
			transparent: true,
			depthWrite: false,
			depthTest: false,
			blending: THREE.NormalBlending
		} );
		compositeMaterial.toneMapped = false;

		return {
			compiled,
			baseMaterial,
			baseUniforms,
			compositeMaterial,
			compositeUniforms,
			dynamicParamState
		};

	}

	_createOceanProMaterials( template ) {

		const fallbackGraph = template?.graph || getDefaultShaderTemplate()?.graph || null;
		if ( ! fallbackGraph ) throw new Error( 'Ocean Pro fallback graph is missing.' );

		const compiled = compileShaderGraph( fallbackGraph, { strictMode: false } );
		const defaults = template?.oceanProDefaults || {};
		const oceanState = normalizeOceanProState( defaults, this.oceanProState );
		const tint = resolveColor( this.params.tintColor );
		const deepColor = resolveColor( oceanState.deepColor, '#0a334f' );
		const shallowColor = resolveColor( oceanState.shallowColor, '#6cd2d9' );

		const baseUniforms = {
			uTime: { value: this.time },
			uResolution: { value: new THREE.Vector2( 1, 1 ) },
			uOpacity: { value: this.params.overlayOpacity },
			uIntensity: { value: this.params.overlayIntensity },
			uTint: { value: tint.clone() },
			uOceanDeep: { value: deepColor },
			uOceanShallow: { value: shallowColor },
			uWaveScale: { value: oceanState.waveScale },
			uCausticScale: { value: oceanState.causticScale },
			uChoppy: { value: oceanState.choppy },
			uFlowSpeed: { value: oceanState.flowSpeed },
			uCausticBoost: { value: oceanState.causticBoost },
			uNight: { value: oceanState.night ? 1.0 : 0.0 }
		};

		const baseMaterial = new THREE.ShaderMaterial( {
			name: 'ShaderBuilderOceanProBaseMaterial',
			vertexShader: compiled.baseVertexShader || compiled.vertexShader,
			fragmentShader: OCEAN_PRO_FRAGMENT,
			uniforms: baseUniforms,
			transparent: true,
			depthWrite: false,
			depthTest: false,
			blending: THREE.NormalBlending
		} );
		baseMaterial.toneMapped = false;

		const compositeUniforms = {
			uBaseTex: { value: null },
			uBloomTex: { value: null },
			uHistoryTex: { value: null },
			uFeedbackEnabled: { value: 1.0 },
			uResolution: { value: new THREE.Vector2( 1, 1 ) },
			uTime: { value: this.time },
			uOpacity: { value: this.params.overlayOpacity },
			uIntensity: { value: this.params.overlayIntensity },
			uTint: { value: tint.clone() }
		};

		const compositeMaterial = new THREE.ShaderMaterial( {
			name: 'ShaderBuilderOceanProCompositeMaterial',
			vertexShader: compiled.baseVertexShader || compiled.vertexShader,
			fragmentShader: compiled.compositeFragmentShader,
			uniforms: compositeUniforms,
			transparent: true,
			depthWrite: false,
			depthTest: false,
			blending: THREE.NormalBlending
		} );
		compositeMaterial.toneMapped = false;

		const passConfig = {
			...compiled.passConfig,
			bloomAmount: clampNumber( compiled.passConfig?.bloomAmount, 0, 2.5, 1.58 ),
			blurAmount: clampNumber( compiled.passConfig?.blurAmount, 0, 1.0, 0.48 ),
			feedbackAmount: clampNumber( compiled.passConfig?.feedbackAmount, 0, 1.0, 0.05 ),
			vignetteAmount: clampNumber( compiled.passConfig?.vignetteAmount, 0, 1.5, 0.08 ),
			chromaticAmount: clampNumber( compiled.passConfig?.chromaticAmount, 0, 1.0, 0.03 ),
			bloomThreshold: clampNumber( compiled.passConfig?.bloomThreshold, 0, 1.0, 0.33 )
		};

		const compiledPassSources = {
			baseVertexShader: compiled.baseVertexShader || compiled.vertexShader || '',
			baseFragmentShader: OCEAN_PRO_FRAGMENT,
			compositeFragmentShader: compiled.compositeFragmentShader || '',
			postFxConfig: JSON.stringify( passConfig, null, 2 )
		};

		return {
			compiledPassSources,
			passConfig,
			baseMaterial,
			baseUniforms,
			compositeMaterial,
			compositeUniforms
		};

	}

	_createFireProMaterials( template ) {

		const fallbackGraph = template?.graph || getDefaultShaderTemplate()?.graph || null;
		if ( ! fallbackGraph ) throw new Error( 'Fire Pro fallback graph is missing.' );

		const compiled = compileShaderGraph( fallbackGraph, { strictMode: false } );
		const defaults = template?.fireProDefaults || {};
		const fireState = normalizeFireProState( defaults, this.fireProState );
		const tint = resolveColor( this.params.tintColor );

		const baseUniforms = {
			uTime: { value: this.time },
			uResolution: { value: new THREE.Vector2( 1, 1 ) },
			uOpacity: { value: this.params.overlayOpacity },
			uIntensity: { value: this.params.overlayIntensity },
			uTint: { value: tint.clone() },
			uNoiseScale: { value: fireState.noiseScale },
			uTurbulence: { value: fireState.turbulence },
			uUpdraft: { value: fireState.updraft },
			uGlow: { value: fireState.glow },
			uSparkAmount: { value: fireState.sparkAmount },
			uCoreColor: { value: resolveColor( fireState.coreColor, '#fff3cf' ) },
			uFlameColor: { value: resolveColor( fireState.flameColor, '#ff6a1f' ) },
			uSmokeColor: { value: resolveColor( fireState.smokeColor, '#2d0f08' ) }
		};

		const baseMaterial = new THREE.ShaderMaterial( {
			name: 'ShaderBuilderFireProBaseMaterial',
			vertexShader: compiled.baseVertexShader || compiled.vertexShader,
			fragmentShader: FIRE_PRO_FRAGMENT,
			uniforms: baseUniforms,
			transparent: true,
			depthWrite: false,
			depthTest: false,
			blending: THREE.NormalBlending
		} );
		baseMaterial.toneMapped = false;

		const compositeUniforms = {
			uBaseTex: { value: null },
			uBloomTex: { value: null },
			uHistoryTex: { value: null },
			uFeedbackEnabled: { value: 1.0 },
			uResolution: { value: new THREE.Vector2( 1, 1 ) },
			uTime: { value: this.time },
			uOpacity: { value: this.params.overlayOpacity },
			uIntensity: { value: this.params.overlayIntensity },
			uTint: { value: tint.clone() }
		};

		const compositeMaterial = new THREE.ShaderMaterial( {
			name: 'ShaderBuilderFireProCompositeMaterial',
			vertexShader: compiled.baseVertexShader || compiled.vertexShader,
			fragmentShader: compiled.compositeFragmentShader,
			uniforms: compositeUniforms,
			transparent: true,
			depthWrite: false,
			depthTest: false,
			blending: THREE.NormalBlending
		} );
		compositeMaterial.toneMapped = false;

		const passConfig = {
			...compiled.passConfig,
			bloomAmount: clampNumber( compiled.passConfig?.bloomAmount, 0, 2.5, 2.04 ),
			blurAmount: clampNumber( compiled.passConfig?.blurAmount, 0, 1.0, 0.46 ),
			feedbackAmount: clampNumber( compiled.passConfig?.feedbackAmount, 0, 1.0, 0.04 ),
			vignetteAmount: clampNumber( compiled.passConfig?.vignetteAmount, 0, 1.5, 0.16 ),
			chromaticAmount: clampNumber( compiled.passConfig?.chromaticAmount, 0, 1.0, 0.07 ),
			bloomThreshold: clampNumber( compiled.passConfig?.bloomThreshold, 0, 1.0, 0.18 )
		};

		const compiledPassSources = {
			baseVertexShader: compiled.baseVertexShader || compiled.vertexShader || '',
			baseFragmentShader: FIRE_PRO_FRAGMENT,
			compositeFragmentShader: compiled.compositeFragmentShader || '',
			postFxConfig: JSON.stringify( passConfig, null, 2 )
		};

		return {
			compiledPassSources,
			passConfig,
			baseMaterial,
			baseUniforms,
			compositeMaterial,
			compositeUniforms
		};

	}

	_applyTextureUniforms() {

		if ( ! this.baseUniforms ) return;
		if ( this.baseUniforms.uTexA ) this.baseUniforms.uTexA.value = this.textureSlots.a.texture;
		if ( this.baseUniforms.uTexB ) this.baseUniforms.uTexB.value = this.textureSlots.b.texture;

	}

	_applyPreviewUniforms() {

		if ( ! this.baseUniforms ) return;
		if ( this.baseUniforms.uShaderMode ) this.baseUniforms.uShaderMode.value = modeIndex( this.previewState.shaderMode );
		if ( this.baseUniforms.uPreviewStage ) this.baseUniforms.uPreviewStage.value = stageIndex( this.previewState.previewStage );
		if ( this.baseUniforms.uRigLightDir?.value?.set ) this.baseUniforms.uRigLightDir.value.set( this.previewState.lightDir[ 0 ], this.previewState.lightDir[ 1 ], this.previewState.lightDir[ 2 ] );
		if ( this.baseUniforms.uRigAmbient ) this.baseUniforms.uRigAmbient.value = this.previewState.ambient;
		if ( this.baseUniforms.uRigKey ) this.baseUniforms.uRigKey.value = this.previewState.key;
		if ( this.baseUniforms.uRigRim ) this.baseUniforms.uRigRim.value = this.previewState.rim;
		if ( this.baseUniforms.uStageZoom ) this.baseUniforms.uStageZoom.value = this.previewState.stageZoom;
		if ( this.baseUniforms.uStageRotate ) this.baseUniforms.uStageRotate.value = this.previewState.stageRotate;
		if ( this.baseUniforms.uVolumeDensity ) this.baseUniforms.uVolumeDensity.value = this.previewState.volumeDensity;
		if ( this.baseUniforms.uVolumeSteps ) this.baseUniforms.uVolumeSteps.value = this.previewState.volumeSteps;
		if ( this.baseUniforms.uVolumeStretch ) this.baseUniforms.uVolumeStretch.value = this.previewState.volumeStretch;

	}

	_resolveParamLabel( nodeId ) {

		const node = this.activeGraph?.nodes?.find?.( ( item ) => Number( item?.id ) === Number( nodeId ) );
		if ( node?.title ) return `${ node.title } #${ nodeId }`;
		return `Param #${ nodeId }`;

	}

	_readGraphMeta() {

		return this.activeGraph?.config?.shaderBuilder || null;

	}

	_writeGraphMeta() {

		if ( ! this.activeGraph || typeof this.activeGraph !== 'object' ) return;
		if ( ! this.activeGraph.config || typeof this.activeGraph.config !== 'object' ) this.activeGraph.config = {};
		const trackExport = {};
		for ( const [ key, track ] of Object.entries( this.timelineState.tracks || {} ) ) {

			trackExport[ key ] = {
				enabled: track?.enabled === true,
				values: Array.isArray( track?.values ) ? track.values.slice( 0, 3 ) : [ 0, 0, 0 ]
			};

		}
		this.activeGraph.config.shaderBuilder = {
			exposedParamIds: this.exposedParamIds.slice(),
			timelineState: {
				enabled: this.timelineState.enabled === true,
				playing: this.timelineState.playing === true,
				loop: this.timelineState.loop !== false,
				duration: this.timelineState.duration,
				time: this.timelineState.time,
				tracks: trackExport
			}
		};

	}

	_applyDynamicParamValue( nodeId, value, persist = false ) {

		const id = Number( nodeId );
		const descriptor = this.dynamicParamState.get( id );
		if ( ! descriptor || ! this.baseUniforms ) return false;
		const uniform = this.baseUniforms[ descriptor.uniformName ];
		if ( ! uniform ) return false;

		if ( descriptor.type === 'vec3' ) {

			const source = Array.isArray( value ) ? value : [ descriptor.value[ 0 ], descriptor.value[ 1 ], descriptor.value[ 2 ] ];
			const next = [
				clampNumber( source[ 0 ], - 1000, 1000, descriptor.value[ 0 ] ),
				clampNumber( source[ 1 ], - 1000, 1000, descriptor.value[ 1 ] ),
				clampNumber( source[ 2 ], - 1000, 1000, descriptor.value[ 2 ] )
			];
			descriptor.value = next;
			uniform.value?.set?.( next[ 0 ], next[ 1 ], next[ 2 ] );

		} else if ( descriptor.type === 'vec2' ) {

			const source = Array.isArray( value ) ? value : [ descriptor.value[ 0 ], descriptor.value[ 1 ] ];
			const next = [
				clampNumber( source[ 0 ], - 1000, 1000, descriptor.value[ 0 ] ),
				clampNumber( source[ 1 ], - 1000, 1000, descriptor.value[ 1 ] )
			];
			descriptor.value = next;
			uniform.value?.set?.( next[ 0 ], next[ 1 ] );

		} else {

			const next = clampNumber( value, - 1000, 1000, descriptor.value );
			descriptor.value = next;
			uniform.value = next;

		}

		if ( persist ) this._writeGraphMeta();
		return true;

	}

	_syncGraphDrivenStateFromMeta() {

		const meta = this._readGraphMeta() || {};
		const sourceExposed = Array.isArray( meta.exposedParamIds ) ? meta.exposedParamIds : [];
		const validIds = new Set( this.dynamicParamState.keys() );
		this.exposedParamIds = sourceExposed
			.map( ( value ) => Number( value ) )
			.filter( ( value, index, arr ) => Number.isFinite( value ) && validIds.has( value ) && arr.indexOf( value ) === index );
		if ( this.exposedParamIds.length === 0 ) {

			this.exposedParamIds = Array.from( this.dynamicParamState.values() )
				.filter( ( descriptor ) => descriptor.type === 'float' )
				.slice( 0, 4 )
				.map( ( descriptor ) => descriptor.nodeId );

		}

		this.timelineState = normalizeTimelineState(
			meta.timelineState || {},
			this.timelineState,
			this.dynamicParamState
		);
		this.timelineState.time = clampNumber( this.timelineState.time, 0, this.timelineState.duration, 0 );

	}

	_applyOceanProTemplate( template ) {

		const previousBaseMaterial = this.baseMaterial;
		const previousCompositeMaterial = this.compositeMaterial;

		const next = this._createOceanProMaterials( template );
		this.oceanProState = normalizeOceanProState( template?.oceanProDefaults || {}, this.oceanProState );

		this.baseMaterial = next.baseMaterial;
		this.material = this.baseMaterial;
		this.baseUniforms = next.baseUniforms;
		this.oceanProUniforms = next.baseUniforms;
		this.fireProUniforms = null;
		this.dynamicParamState = new Map();
		this.exposedParamIds = [];
		this.timelineState = createDefaultTimelineState();
		this.overlayMesh.material = this.baseMaterial;

		this.compositeMaterial = next.compositeMaterial;
		this.compositeUniforms = next.compositeUniforms;

		this.activeGraph = template?.graph ? deepClone( template.graph ) : null;
		this.lastCompileAt = Date.now();
		this.lastError = null;
		this.lastCompiledVertexShader = next.compiledPassSources.baseVertexShader || '';
		this.lastCompiledFragmentShader = next.compiledPassSources.baseFragmentShader || '';
		this.compiledPassSources = { ...next.compiledPassSources };
		this.passConfig = { ...this.passConfig, ...next.passConfig };
		this.postFxState = { ...this.postFxState, ...this.passConfig };
		this.enabled = true;
		this.activeRenderMode = 'oceanPro';
		this.historyInitialized = false;
		this.setOceanProParams( this.oceanProState );

		if ( previousBaseMaterial && previousBaseMaterial !== this.baseMaterial ) previousBaseMaterial.dispose();
		if ( previousCompositeMaterial && previousCompositeMaterial !== this.compositeMaterial ) previousCompositeMaterial.dispose();

		return true;

	}

	_applyFireProTemplate( template ) {

		const previousBaseMaterial = this.baseMaterial;
		const previousCompositeMaterial = this.compositeMaterial;

		const next = this._createFireProMaterials( template );
		this.fireProState = normalizeFireProState( template?.fireProDefaults || {}, this.fireProState );

		this.baseMaterial = next.baseMaterial;
		this.material = this.baseMaterial;
		this.baseUniforms = next.baseUniforms;
		this.oceanProUniforms = null;
		this.fireProUniforms = next.baseUniforms;
		this.dynamicParamState = new Map();
		this.exposedParamIds = [];
		this.timelineState = createDefaultTimelineState();
		this.overlayMesh.material = this.baseMaterial;

		this.compositeMaterial = next.compositeMaterial;
		this.compositeUniforms = next.compositeUniforms;

		this.activeGraph = template?.graph ? deepClone( template.graph ) : null;
		this.lastCompileAt = Date.now();
		this.lastError = null;
		this.lastCompiledVertexShader = next.compiledPassSources.baseVertexShader || '';
		this.lastCompiledFragmentShader = next.compiledPassSources.baseFragmentShader || '';
		this.compiledPassSources = { ...next.compiledPassSources };
		this.passConfig = { ...this.passConfig, ...next.passConfig };
		this.postFxState = { ...this.postFxState, ...this.passConfig };
		this.enabled = true;
		this.activeRenderMode = 'firePro';
		this.historyInitialized = false;
		this.setFireProParams( this.fireProState );

		if ( previousBaseMaterial && previousBaseMaterial !== this.baseMaterial ) previousBaseMaterial.dispose();
		if ( previousCompositeMaterial && previousCompositeMaterial !== this.compositeMaterial ) previousCompositeMaterial.dispose();

		return true;

	}

	_applyGraphInternal( graph, options = {} ) {

		const safeGraph = deepClone( graph );
		const previousBaseMaterial = this.baseMaterial;
		const previousCompositeMaterial = this.compositeMaterial;

		const next = this._createGraphMaterials( safeGraph );

		this.baseMaterial = next.baseMaterial;
		this.material = this.baseMaterial;
		this.baseUniforms = next.baseUniforms;
		this.oceanProUniforms = null;
		this.fireProUniforms = null;
		this.dynamicParamState = next.dynamicParamState || new Map();
		this.overlayMesh.material = this.baseMaterial;

		this.compositeMaterial = next.compositeMaterial;
		this.compositeUniforms = next.compositeUniforms;

		this.activeGraph = safeGraph;
		this.lastCompileAt = Date.now();
		this.lastError = null;
		this.lastCompiledVertexShader = next.compiled.baseVertexShader || next.compiled.vertexShader || '';
		this.lastCompiledFragmentShader = next.compiled.baseFragmentShader || next.compiled.fragmentShader || '';
		this.compiledPassSources = next.compiled.compiledPassSources || null;
		this.passConfig = { ...this.passConfig, ...( next.compiled.passConfig || {} ) };
		this.postFxState = { ...this.postFxState, ...this.passConfig };
		this.enabled = true;
		this.activeRenderMode = 'graph';
		this.historyInitialized = false;
		this._applyTextureUniforms();
		this._applyPreviewUniforms();
		this._syncGraphDrivenStateFromMeta();
		this._writeGraphMeta();

		if ( typeof options.templateId === 'string' && options.templateId.length > 0 ) {

			this.activeTemplateId = options.templateId;

		}

		if ( previousBaseMaterial && previousBaseMaterial !== this.baseMaterial ) previousBaseMaterial.dispose();
		if ( previousCompositeMaterial && previousCompositeMaterial !== this.compositeMaterial ) previousCompositeMaterial.dispose();

		return true;

	}

	applyGraph( graph, options = {} ) {

		try {

			return this._applyGraphInternal( graph, options );

		} catch ( error ) {

			this.lastError = error?.message || String( error );
			return false;

		}

	}

	applyTemplate( templateId ) {

		const template = getShaderTemplate( templateId ) || getDefaultShaderTemplate();
		if ( ! template ) return false;
		let success = false;
		if ( template.renderMode === 'oceanPro' ) {

			try {

				success = this._applyOceanProTemplate( template );

			} catch ( error ) {

				this.lastError = error?.message || String( error );
				success = false;

			}

		} else if ( template.renderMode === 'firePro' ) {

			try {

				success = this._applyFireProTemplate( template );

			} catch ( error ) {

				this.lastError = error?.message || String( error );
				success = false;

			}

		} else {

			success = this.applyGraph( template.graph, { templateId: template.id } );

		}
		if ( success ) {

			// Keep advanced/special templates visually readable even if user previously set near-zero overlay params.
			if ( template.tier === 'advanced' || template.renderMode !== 'graph' ) {

				this.setParams( {
					overlayOpacity: Math.max( Number( this.params.overlayOpacity ) || 0, 0.9 ),
					overlayIntensity: Math.max( Number( this.params.overlayIntensity ) || 0, 1.45 )
				} );

			}

			this.activeTemplateId = template.id;
			this.activeTemplateTier = template.tier === 'advanced' ? 'advanced' : 'basic';
			this.activeSavedGraphId = null;
			this.store.setActiveGraphId( null );

		}
		return success;

	}

	applyPreset( presetName ) {

		const meta = PRESET_META[ presetName ];
		if ( ! meta || meta.category !== 'shaderBuilder' ) return false;

		this.activePreset = presetName;
		const defaults = meta.shaderBuilderDefaults || {};
		this.setParams( {
			overlayOpacity: defaults.overlayOpacity,
			overlayIntensity: defaults.overlayIntensity,
			tintColor: defaults.tintColor
		} );

		const templateId = meta.shaderTemplateId || 'shaderNeonTornado';
		const ok = this.applyTemplate( templateId );
		if ( ok && meta.postFxDefaults ) {

			this.postFxState = {
				...this.postFxState,
				...meta.postFxDefaults
			};

		}
		return ok;

	}

	setParams( partial = {} ) {

		this.params.overlayOpacity = clampNumber( partial.overlayOpacity, 0, 1, this.params.overlayOpacity );
		this.params.overlayIntensity = clampNumber( partial.overlayIntensity, 0, 3, this.params.overlayIntensity );
		if ( typeof partial.tintColor === 'string' && partial.tintColor.trim().length > 0 ) {

			this.params.tintColor = partial.tintColor;

		}

		if ( partial.postFxState && typeof partial.postFxState === 'object' ) {

			this.postFxState = {
				...this.postFxState,
				...partial.postFxState
			};

		}

		if ( this.baseUniforms ) {

			this.baseUniforms.uOpacity.value = this.params.overlayOpacity;
			this.baseUniforms.uIntensity.value = this.params.overlayIntensity;
			this.baseUniforms.uTint.value.copy( resolveColor( this.params.tintColor ) );

		}

		if ( this.compositeUniforms ) {

			this.compositeUniforms.uOpacity.value = this.params.overlayOpacity;
			this.compositeUniforms.uIntensity.value = this.params.overlayIntensity;
			this.compositeUniforms.uTint.value.copy( resolveColor( this.params.tintColor ) );

		}

	}

	setOceanProParams( partial = {} ) {

		this.oceanProState = normalizeOceanProState( partial, this.oceanProState );
		if ( ! this.oceanProUniforms ) return;

		if ( this.oceanProUniforms.uWaveScale ) this.oceanProUniforms.uWaveScale.value = this.oceanProState.waveScale;
		if ( this.oceanProUniforms.uCausticScale ) this.oceanProUniforms.uCausticScale.value = this.oceanProState.causticScale;
		if ( this.oceanProUniforms.uChoppy ) this.oceanProUniforms.uChoppy.value = this.oceanProState.choppy;
		if ( this.oceanProUniforms.uFlowSpeed ) this.oceanProUniforms.uFlowSpeed.value = this.oceanProState.flowSpeed;
		if ( this.oceanProUniforms.uCausticBoost ) this.oceanProUniforms.uCausticBoost.value = this.oceanProState.causticBoost;
		if ( this.oceanProUniforms.uNight ) this.oceanProUniforms.uNight.value = this.oceanProState.night ? 1.0 : 0.0;
		if ( this.oceanProUniforms.uOceanDeep?.value?.copy ) this.oceanProUniforms.uOceanDeep.value.copy( resolveColor( this.oceanProState.deepColor, '#0a334f' ) );
		if ( this.oceanProUniforms.uOceanShallow?.value?.copy ) this.oceanProUniforms.uOceanShallow.value.copy( resolveColor( this.oceanProState.shallowColor, '#6cd2d9' ) );

	}

	setFireProParams( partial = {} ) {

		this.fireProState = normalizeFireProState( partial, this.fireProState );
		if ( ! this.fireProUniforms ) return;

		if ( this.fireProUniforms.uNoiseScale ) this.fireProUniforms.uNoiseScale.value = this.fireProState.noiseScale;
		if ( this.fireProUniforms.uTurbulence ) this.fireProUniforms.uTurbulence.value = this.fireProState.turbulence;
		if ( this.fireProUniforms.uUpdraft ) this.fireProUniforms.uUpdraft.value = this.fireProState.updraft;
		if ( this.fireProUniforms.uGlow ) this.fireProUniforms.uGlow.value = this.fireProState.glow;
		if ( this.fireProUniforms.uSparkAmount ) this.fireProUniforms.uSparkAmount.value = this.fireProState.sparkAmount;
		if ( this.fireProUniforms.uCoreColor?.value?.copy ) this.fireProUniforms.uCoreColor.value.copy( resolveColor( this.fireProState.coreColor, '#fff3cf' ) );
		if ( this.fireProUniforms.uFlameColor?.value?.copy ) this.fireProUniforms.uFlameColor.value.copy( resolveColor( this.fireProState.flameColor, '#ff6a1f' ) );
		if ( this.fireProUniforms.uSmokeColor?.value?.copy ) this.fireProUniforms.uSmokeColor.value.copy( resolveColor( this.fireProState.smokeColor, '#2d0f08' ) );

	}

	setPreviewSettings( partial = {} ) {

		this.previewState = normalizePreviewState( partial, this.previewState );
		this._applyPreviewUniforms();

	}

	setLightingRigPreset( presetId ) {

		const rig = resolveRigPresetName( presetId, this.previewState.lightingRig || 'studio' );
		const defaults = LIGHTING_RIG_PRESETS[ rig ] || LIGHTING_RIG_PRESETS.studio;
		this.previewState = normalizePreviewState( {
			...this.previewState,
			lightingRig: rig,
			ambient: defaults.ambient,
			key: defaults.key,
			rim: defaults.rim,
			lightDir: defaults.lightDir.slice()
		}, this.previewState );
		this._applyPreviewUniforms();

	}

	async setTextureFromFile( slot, file ) {

		const key = slot === 'b' ? 'b' : 'a';
		if ( ! file ) throw new Error( 'Texture file is missing.' );

		const texture = await loadTextureFromFile( file );
		const previous = this.textureSlots[ key ]?.texture || null;
		this.textureSlots[ key ] = {
			texture,
			name: file.name || ( key === 'a' ? 'Texture A' : 'Texture B' )
		};

		if ( previous && previous !== this.defaultTextureA && previous !== this.defaultTextureB ) {

			previous.dispose?.();

		}

		this._applyTextureUniforms();
		return this.textureSlots[ key ];

	}

	clearTextureSlot( slot ) {

		const key = slot === 'b' ? 'b' : 'a';
		const fallback = key === 'b'
			? { texture: this.defaultTextureB, name: 'Default Cool' }
			: { texture: this.defaultTextureA, name: 'Default White' };
		const previous = this.textureSlots[ key ]?.texture || null;
		this.textureSlots[ key ] = fallback;

		if ( previous && previous !== this.defaultTextureA && previous !== this.defaultTextureB ) {

			previous.dispose?.();

		}

		this._applyTextureUniforms();

	}

	setExposedParamIds( ids = [] ) {

		const valid = new Set( this.dynamicParamState.keys() );
		this.exposedParamIds = Array.isArray( ids )
			? ids.map( ( value ) => Number( value ) ).filter( ( value, index, arr ) => Number.isFinite( value ) && valid.has( value ) && arr.indexOf( value ) === index )
			: [];
		this._writeGraphMeta();

	}

	setDynamicParam( nodeId, value, options = {} ) {

		const persist = options.persist !== false;
		return this._applyDynamicParamValue( nodeId, value, persist );

	}

	setTimelineSettings( partial = {} ) {

		this.timelineState = normalizeTimelineState(
			{
				...this.timelineState,
				...partial
			},
			this.timelineState,
			this.dynamicParamState
		);
		this.timelineState.time = clampNumber( this.timelineState.time, 0, this.timelineState.duration, 0 );
		this._writeGraphMeta();

	}

	setTimelineTrack( nodeId, track = {} ) {

		const id = Number( nodeId );
		const descriptor = this.dynamicParamState.get( id );
		if ( ! descriptor || descriptor.type !== 'float' ) return;

		const current = this.timelineState.tracks[ id ] || {
			enabled: false,
			values: [ descriptor.value, descriptor.value, descriptor.value ]
		};
		const values = Array.isArray( track.values ) ? track.values : current.values;
		this.timelineState.tracks[ id ] = {
			enabled: track.enabled !== undefined ? track.enabled === true : current.enabled === true,
			values: [
				clampNumber( values[ 0 ], - 1000, 1000, descriptor.value ),
				clampNumber( values[ 1 ], - 1000, 1000, descriptor.value ),
				clampNumber( values[ 2 ], - 1000, 1000, descriptor.value )
			]
		};
		this._writeGraphMeta();

	}

	seekTimeline( time ) {

		this.timelineState.time = clampNumber( time, 0, this.timelineState.duration, this.timelineState.time );
		if ( ! this.timelineState.enabled ) {

			this._writeGraphMeta();
			return;

		}

		const tNorm = this.timelineState.duration > 0 ? this.timelineState.time / this.timelineState.duration : 0;
		for ( const [ key, track ] of Object.entries( this.timelineState.tracks || {} ) ) {

			if ( ! track || track.enabled !== true ) continue;
			const value = evaluateTimelineTrack( track, tNorm );
			this._applyDynamicParamValue( Number( key ), value, false );

		}
		this._writeGraphMeta();

	}

	setEnabled( enabled ) {

		this.enabled = enabled === true;

	}

	clear() {

		this.enabled = false;

	}

	_disposeRenderTargets() {

		for ( const target of [ this.rtA, this.rtB, this.rtC, this.rtFinal, this.rtHistory ] ) {

			target?.dispose?.();

		}
		this.rtA = null;
		this.rtB = null;
		this.rtC = null;
		this.rtFinal = null;
		this.rtHistory = null;
		this.rtWidth = 0;
		this.rtHeight = 0;
		this.historyInitialized = false;

	}

	_ensureRenderTargets( renderer ) {

		if ( ! renderer ) return;
		const tier = this._getTierConfig();
		const screenSize = renderer.getDrawingBufferSize ? renderer.getDrawingBufferSize( new THREE.Vector2() ) : renderer.getSize( new THREE.Vector2() );
		const width = Math.max( 2, Math.floor( screenSize.x * tier.renderScale ) );
		const height = Math.max( 2, Math.floor( screenSize.y * tier.renderScale ) );

		if ( this.rtWidth === width && this.rtHeight === height && this.rtA && this.rtHistory ) return;

		this._disposeRenderTargets();
		this.rtA = createRenderTarget( width, height );
		this.rtB = createRenderTarget( width, height );
		this.rtC = createRenderTarget( width, height );
		this.rtFinal = createRenderTarget( width, height );
		this.rtHistory = createRenderTarget( width, height );
		this.rtWidth = width;
		this.rtHeight = height;
		this.historyInitialized = false;

	}

	_renderFullscreen( renderer, material, target = null, clear = true ) {

		if ( ! renderer || ! material ) return;
		const previousMaterial = this.fullscreenQuad.material;
		this.fullscreenQuad.material = material;
		renderer.setRenderTarget( target );
		if ( clear ) renderer.clear();
		renderer.render( this.fullscreenScene, this.fullscreenCamera );
		this.fullscreenQuad.material = previousMaterial;

	}

	_effectivePostFxState() {

		return {
			bloomAmount: clampNumber( this.postFxState.bloomAmount, 0, 2.5, this.passConfig.bloomAmount ),
			blurAmount: clampNumber( this.postFxState.blurAmount, 0, 1, this.passConfig.blurAmount ),
			feedbackAmount: clampNumber( this.postFxState.feedbackAmount, 0, 1, this.passConfig.feedbackAmount ),
			vignetteAmount: clampNumber( this.postFxState.vignetteAmount, 0, 1.5, this.passConfig.vignetteAmount ),
			chromaticAmount: clampNumber( this.postFxState.chromaticAmount, 0, 1, this.passConfig.chromaticAmount ),
			bloomThreshold: clampNumber( this.passConfig.bloomThreshold, 0, 1, 0.52 )
		};

	}

	update( delta, renderer ) {

		if ( ! this.baseUniforms ) return;

		this.time += Math.max( 0, Number( delta ) || 0 );
		if ( this.baseUniforms.uTime ) this.baseUniforms.uTime.value = this.time;
		if ( this.baseUniforms.uMouse?.value?.copy ) this.baseUniforms.uMouse.value.copy( this.mouse );
		if ( this.compositeUniforms ) {

			this.compositeUniforms.uTime.value = this.time;

		}

		if ( renderer && typeof renderer.getSize === 'function' ) {

			const size = renderer.getSize( new THREE.Vector2() );
			if ( this.baseUniforms.uResolution?.value?.set ) {

				this.baseUniforms.uResolution.value.set( Math.max( 1, size.x ), Math.max( 1, size.y ) );

			}
			if ( this.compositeUniforms?.uResolution?.value?.set && this.baseUniforms.uResolution?.value ) {

				this.compositeUniforms.uResolution.value.copy( this.baseUniforms.uResolution.value );

			}

		}

		if ( this.activeRenderMode === 'graph' && this.timelineState.enabled === true ) {

			if ( this.timelineState.playing === true ) {

				this.timelineState.time += Math.max( 0, Number( delta ) || 0 );
				if ( this.timelineState.time > this.timelineState.duration ) {

					if ( this.timelineState.loop === false ) {

						this.timelineState.time = this.timelineState.duration;
						this.timelineState.playing = false;

					} else {

						this.timelineState.time = this.timelineState.time % Math.max( this.timelineState.duration, 0.0001 );

					}

				}

			}

			const tNorm = this.timelineState.duration > 0 ? this.timelineState.time / this.timelineState.duration : 0;
			for ( const [ key, track ] of Object.entries( this.timelineState.tracks || {} ) ) {

				if ( ! track || track.enabled !== true ) continue;
				const value = evaluateTimelineTrack( track, tNorm );
				this._applyDynamicParamValue( Number( key ), value, false );

			}

		}

		this._updateAdaptiveQuality( delta );

	}

	renderOverlay( renderer ) {

		if ( ! renderer || ! this.enabled || ! this.baseMaterial || ! this.compositeMaterial ) return;

		this._ensureRenderTargets( renderer );
		if ( ! this.rtA || ! this.rtB || ! this.rtC || ! this.rtFinal || ! this.rtHistory ) return;

		const tier = this._getTierConfig();
		const fx = this._effectivePostFxState();

		const previousTarget = renderer.getRenderTarget ? renderer.getRenderTarget() : null;
		const previousAutoClear = renderer.autoClear;
		const previousClearColor = renderer.getClearColor( new THREE.Color() );
		const previousClearAlpha = renderer.getClearAlpha();

		renderer.autoClear = true;
		renderer.setClearColor( 0x000000, 0 );

		// Base pass
		renderer.setRenderTarget( this.rtA );
		renderer.clear();
		renderer.render( this.overlayScene, this.overlayCamera );

		// Bright pass
		this.brightPassMaterial.uniforms.uTexture.value = this.rtA.texture;
		this.brightPassMaterial.uniforms.uThreshold.value = fx.bloomThreshold;
		this.brightPassMaterial.uniforms.uStrength.value = fx.bloomAmount;
		this._renderFullscreen( renderer, this.brightPassMaterial, this.rtB, true );

		let passCount = 2;

		if ( tier.blurIterations > 0 && fx.blurAmount > 0.001 ) {

			for ( let i = 0; i < tier.blurIterations; i ++ ) {

				this.blurPassMaterial.uniforms.uTexture.value = this.rtB.texture;
				this.blurPassMaterial.uniforms.uResolution.value.set( this.rtWidth, this.rtHeight );
				this.blurPassMaterial.uniforms.uDirection.value.set( 1, 0 );
				this.blurPassMaterial.uniforms.uRadius.value = 0.5 + fx.blurAmount * 2.5;
				this._renderFullscreen( renderer, this.blurPassMaterial, this.rtC, true );

				this.blurPassMaterial.uniforms.uTexture.value = this.rtC.texture;
				this.blurPassMaterial.uniforms.uDirection.value.set( 0, 1 );
				this._renderFullscreen( renderer, this.blurPassMaterial, this.rtB, true );
				passCount += 2;

			}

		}

		// Composite pass -> offscreen final
		this.compositeUniforms.uBaseTex.value = this.rtA.texture;
		this.compositeUniforms.uBloomTex.value = this.rtB.texture;
		this.compositeUniforms.uHistoryTex.value = this.rtHistory.texture;
		this.compositeUniforms.uFeedbackEnabled.value = tier.feedbackEnabled ? 1.0 : 0.0;

		this._renderFullscreen( renderer, this.compositeMaterial, this.rtFinal, true );
		passCount ++;

		// Screen blend pass
		this.screenPassMaterial.uniforms.uTexture.value = this.rtFinal.texture;
		this.screenPassMaterial.uniforms.uOpacity.value = 1.0;
		this._renderFullscreen( renderer, this.screenPassMaterial, null, false );
		passCount ++;

		// Visibility rescue pass:
		// For advanced/special templates, blend the base pass directly too, so users never see a pure-black output
		// if composite/postfx ends up too dark on certain GPUs or browser drivers.
		if ( this.activeRenderMode !== 'graph' || this.activeTemplateTier === 'advanced' ) {

			this.screenPassMaterial.uniforms.uTexture.value = this.rtA.texture;
			this.screenPassMaterial.uniforms.uOpacity.value = this.activeRenderMode !== 'graph' ? 0.82 : 0.58;
			this._renderFullscreen( renderer, this.screenPassMaterial, null, false );
			this.screenPassMaterial.uniforms.uOpacity.value = 1.0;
			passCount ++;

		}

		// Feedback history update
		if ( tier.feedbackEnabled && fx.feedbackAmount > 0.001 ) {

			this.copyPassMaterial.uniforms.uTexture.value = this.rtFinal.texture;
			this.copyPassMaterial.uniforms.uOpacity.value = 1.0;
			this._renderFullscreen( renderer, this.copyPassMaterial, this.rtHistory, ! this.historyInitialized );
			this.historyInitialized = true;
			passCount ++;

		}

		renderer.setRenderTarget( previousTarget || null );
		renderer.setClearColor( previousClearColor, previousClearAlpha );
		renderer.autoClear = previousAutoClear;

		this.passStats = {
			qualityTier: this.qualityTier,
			qualityLabel: tier.label,
			passCount,
			renderScale: tier.renderScale,
			lastRenderWidth: this.rtWidth,
			lastRenderHeight: this.rtHeight,
			feedbackEnabled: tier.feedbackEnabled
		};

	}

	getTemplates() {

		return getShaderBuilderTemplates();

	}

	listSavedGraphs() {

		return this.store.listGraphs();

	}

	saveCurrentGraph( name, existingId = null ) {

		if ( ! this.activeGraph ) throw new Error( 'No active graph to save.' );
		const saved = this.store.saveGraph( name, this.activeGraph, existingId );
		if ( saved ) {

			this.activeSavedGraphId = saved.id;
			this.store.setActiveGraphId( saved.id );

		}
		return saved;

	}

	loadSavedGraph( graphId ) {

		const saved = this.store.getGraph( graphId );
		if ( ! saved ) throw new Error( 'Saved graph not found.' );
		const success = this.applyGraph( saved.graph );
		if ( ! success ) throw new Error( this.lastError || 'Saved graph compile failed.' );
		this.activeSavedGraphId = saved.id;
		this.store.setActiveGraphId( saved.id );
		return saved;

	}

	deleteSavedGraph( graphId ) {

		const deleted = this.store.deleteGraph( graphId );
		if ( deleted && this.activeSavedGraphId === graphId ) {

			this.activeSavedGraphId = null;

		}
		return deleted;

	}

	exportCurrentGraph() {

		if ( ! this.activeGraph ) throw new Error( 'No active graph to export.' );
		const name = this.activePreset || this.activeTemplateId || 'Shader Graph';
		return this.store.exportGraph( this.activeGraph, name );

	}

	importGraph( serialized ) {

		const payload = this.store.importGraph( serialized );
		const success = this.applyGraph( payload.graph );
		if ( ! success ) throw new Error( this.lastError || 'Imported graph compile failed.' );
		this.activeSavedGraphId = null;
		this.store.setActiveGraphId( null );
		return payload;

	}

	getState() {

		const previewReady = Boolean( this.enabled && this.baseMaterial && this.compositeMaterial );

		return {
			enabled: this.enabled,
			activePreset: this.activePreset,
			activeTemplateId: this.activeTemplateId,
			activeTemplateTier: this.activeTemplateTier,
			activeSavedGraphId: this.activeSavedGraphId,
			activeRenderMode: this.activeRenderMode,
			params: { ...this.params },
			graph: this.activeGraph ? deepClone( this.activeGraph ) : null,
			templates: this.getTemplates(),
			savedGraphs: this.listSavedGraphs(),
			compiledVertexShader: this.lastCompiledVertexShader,
			compiledFragmentShader: this.lastCompiledFragmentShader,
			vertexShader: this.lastCompiledVertexShader,
			fragmentShader: this.lastCompiledFragmentShader,
			compiledPassSources: this.compiledPassSources ? deepClone( this.compiledPassSources ) : null,
			qualityTier: this.qualityTier,
			passStats: this.getPassStats(),
			postFxState: { ...this.postFxState },
			oceanProState: { ...this.oceanProState },
			fireProState: { ...this.fireProState },
			previewState: { ...this.previewState, lightDir: [ ...this.previewState.lightDir ] },
			dynamicParams: Array.from( this.dynamicParamState.values() ).map( ( descriptor ) => ( {
				nodeId: descriptor.nodeId,
				type: descriptor.type,
				uniformName: descriptor.uniformName,
				label: this._resolveParamLabel( descriptor.nodeId ),
				value: Array.isArray( descriptor.value ) ? descriptor.value.slice() : descriptor.value
			} ) ),
			exposedParamIds: this.exposedParamIds.slice(),
			timelineState: {
				enabled: this.timelineState.enabled === true,
				playing: this.timelineState.playing === true,
				loop: this.timelineState.loop !== false,
				duration: this.timelineState.duration,
				time: this.timelineState.time,
				tracks: deepClone( this.timelineState.tracks || {} )
			},
			textureState: {
				aName: this.textureSlots.a.name,
				bName: this.textureSlots.b.name
			},
			previewMeta: {
				shaderModes: SHADER_MODE_OPTIONS.slice(),
				previewStages: PREVIEW_STAGE_OPTIONS.slice(),
				lightingRigs: Object.keys( LIGHTING_RIG_PRESETS )
			},
			previewReady,
			lastError: this.lastError,
			lastCompileAt: this.lastCompileAt
		};

	}

	dispose() {

		if ( this.boundCanvas ) {

			this.boundCanvas.removeEventListener( 'pointermove', this._onPointerMove );
			this.boundCanvas = null;

		}

		this.baseMaterial?.dispose?.();
		this.compositeMaterial?.dispose?.();
		this.brightPassMaterial?.dispose?.();
		this.blurPassMaterial?.dispose?.();
		this.copyPassMaterial?.dispose?.();
		this.screenPassMaterial?.dispose?.();

		this.baseMaterial = null;
		this.compositeMaterial = null;
		this.material = null;
		this.baseUniforms = null;
		this.oceanProUniforms = null;
		this.fireProUniforms = null;
		this.compositeUniforms = null;

		if ( this.textureSlots?.a?.texture && this.textureSlots.a.texture !== this.defaultTextureA && this.textureSlots.a.texture !== this.defaultTextureB ) {

			this.textureSlots.a.texture.dispose?.();

		}
		if ( this.textureSlots?.b?.texture && this.textureSlots.b.texture !== this.defaultTextureA && this.textureSlots.b.texture !== this.defaultTextureB ) {

			this.textureSlots.b.texture.dispose?.();

		}
		this.defaultTextureA?.dispose?.();
		this.defaultTextureB?.dispose?.();
		this.textureSlots = {
			a: { texture: null, name: '' },
			b: { texture: null, name: '' }
		};

		this._disposeRenderTargets();

		if ( this.overlayMesh ) this.overlayScene.remove( this.overlayMesh );
		if ( this.fullscreenQuad ) this.fullscreenScene.remove( this.fullscreenQuad );
		this.overlayQuadGeometry?.dispose?.();

		this.enabled = false;
		this.activeRenderMode = 'graph';

	}

}
