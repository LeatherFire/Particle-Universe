import * as THREE from 'three/webgl';

const BILLBOARD_VERTEX = `
varying vec2 vUv;

void main() {
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

const TWISTER_VERTEX = `
uniform float uTime;
uniform float uTwistSpeed;
uniform float uParabolaStrength;
uniform float uParabolaOffset;
uniform float uParabolaAmplitude;
uniform float uWobble;

varying vec2 vUv;

void main() {
	vUv = uv;

	vec3 p = position;
	float angle = atan( p.z, p.x );
	float radius = pow( uParabolaStrength * ( p.y - uParabolaOffset ), 2.0 ) + uParabolaAmplitude;
	radius += sin( ( p.y - uTime * uTwistSpeed ) * 26.0 + angle * 3.0 ) * uWobble;

	vec3 twisted = vec3(
		cos( angle + p.y * 0.35 ) * radius,
		p.y,
		sin( angle + p.y * 0.35 ) * radius
	);

	gl_Position = projectionMatrix * modelViewMatrix * vec4( twisted, 1.0 );
}
`;

const COMMON_GLSL = `
#define PI 3.141592653589793
#define TWO_PI 6.283185307179586

float sat01( float x ) {
	return clamp( x, 0.0, 1.0 );
}

float hash21( vec2 p ) {
	p = fract( p * vec2( 123.34, 345.45 ) );
	p += dot( p, p + 34.345 );
	return fract( p.x * p.y );
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
`;

const FLOOR_SWIRL_FRAGMENT = `
uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;

varying vec2 vUv;

${ COMMON_GLSL }

vec2 toRadialUv( vec2 uv, vec2 multiplier, float rotation, float offset ) {
	vec2 centered = uv - 0.5;
	float distanceToCenter = length( centered );
	float angle = atan( centered.y, centered.x );
	vec2 radialUv = vec2( ( angle + PI ) / TWO_PI, distanceToCenter );
	radialUv *= multiplier;
	radialUv.x += rotation;
	radialUv.y += offset;
	return radialUv;
}

void main() {
	float t = uTime * 0.22;

	vec2 n1Uv = toRadialUv( vUv, vec2( 0.75, 0.65 ), t, t * 0.8 );
	n1Uv.x += n1Uv.y * -1.1;
	n1Uv *= vec2( 4.8, 1.4 );
	float n1 = smoothstep( 0.45, 0.74, fbm21( n1Uv ) );

	vec2 n2Uv = toRadialUv( vUv, vec2( 1.6, 8.0 ), t * 1.9, t * 7.0 );
	n2Uv.x += n2Uv.y * -0.3;
	n2Uv *= vec2( 2.4, 0.28 );
	float n2 = smoothstep( 0.44, 0.69, fbm21( n2Uv ) );

	float d = length( vUv - 0.5 );
	float fade = ( 1.0 - smoothstep( 0.08, 0.52, d ) ) * smoothstep( 0.0, 0.16, d );

	float effect = n1 * n2 * fade;
	vec3 col = uColor * ( 1.2 + effect * 2.0 ) * uIntensity;
	float alpha = smoothstep( 0.02, 0.95, effect ) * 0.95;

	gl_FragColor = vec4( col, alpha );
}
`;

const TORNADO_CORE_FRAGMENT = `
uniform float uTime;
uniform vec3 uColor;
uniform float uContrast;

varying vec2 vUv;

${ COMMON_GLSL }

void main() {
	float t = uTime * 0.20;

	vec2 flowUv = vUv;
	flowUv.x += sin( vUv.y * 12.0 + t * 2.8 ) * 0.08;

	float bands = fbm21( flowUv * vec2( 6.0, 24.0 ) + vec2( t * 1.9, - t * 1.2 ) );
	float streak = fbm21( flowUv * vec2( 2.5, 65.0 ) + vec2( - t * 2.6, t * 0.6 ) );
	float detail = fbm21( flowUv * vec2( 12.0, 8.0 ) + vec2( t * 0.8, - t * 0.45 ) );

	float structure = smoothstep( 0.38, 0.9, bands ) * 0.7 + smoothstep( 0.55, 0.95, streak ) * 0.9 + detail * 0.25;
	float vertical = smoothstep( 0.01, 0.12, vUv.y ) * ( 1.0 - smoothstep( 0.65, 1.0, vUv.y ) );
	float sideFade = smoothstep( 0.0, 0.22, vUv.x ) * ( 1.0 - smoothstep( 0.78, 1.0, vUv.x ) );

	float effect = structure * vertical * sideFade;
	float glow = pow( sat01( effect ), uContrast );

	vec3 col = uColor * ( 0.85 + glow * 3.2 );
	float alpha = sat01( glow * 1.05 );

	gl_FragColor = vec4( col, alpha );
}
`;

const TORNADO_SHADOW_FRAGMENT = `
uniform float uTime;
uniform vec3 uColor;

varying vec2 vUv;

${ COMMON_GLSL }

void main() {
	float t = uTime * 0.18 + 71.3;

	vec2 flowUv = vUv;
	flowUv.x += sin( vUv.y * 10.0 + t * 2.1 ) * 0.06;

	float smokeA = fbm21( flowUv * vec2( 3.0, 20.0 ) + vec2( t * 1.3, - t * 0.8 ) );
	float smokeB = fbm21( flowUv * vec2( 7.0, 8.0 ) + vec2( - t * 0.6, t * 0.4 ) );
	float smoke = smoothstep( 0.42, 0.88, smokeA ) * 0.75 + smokeB * 0.35;

	float vertical = smoothstep( 0.0, 0.2, vUv.y ) * ( 1.0 - smoothstep( 0.62, 1.0, vUv.y ) );
	float side = smoothstep( 0.0, 0.12, vUv.x ) * ( 1.0 - smoothstep( 0.88, 1.0, vUv.x ) );

	float alpha = smoke * vertical * side * 0.65;
	gl_FragColor = vec4( uColor, alpha );
}
`;

const NEBULA_FRAGMENT = `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uSeed;
uniform float uIntensity;

varying vec2 vUv;

${ COMMON_GLSL }

void main() {
	vec2 p = ( vUv - 0.5 ) * 2.0;
	float r = length( p );

	float nA = fbm21( p * 2.8 + vec2( uTime * 0.07 + uSeed, - uTime * 0.05 ) );
	float nB = fbm21( p * 8.5 + vec2( - uTime * 0.26 + uSeed * 1.8, uTime * 0.18 + uSeed ) );

	float filaments = 0.5 + 0.5 * sin( p.x * 9.0 - p.y * 6.0 + uTime * 0.85 + nB * 7.0 );
	filaments = smoothstep( 0.72, 0.98, filaments );

	float cloud = smoothstep( 0.25, 0.96, nA ) * ( 1.0 - smoothstep( 0.25, 1.05, r ) );
	float dust = smoothstep( 0.78, 0.98, nB ) * ( 1.0 - smoothstep( 0.0, 0.9, r ) );
	float links = filaments * smoothstep( 1.0, 0.1, r );

	float effect = cloud * 0.95 + links * 0.75 + dust * 0.32;
	vec3 col = mix( uColorB, uColorA, sat01( effect * 0.9 + filaments * 0.2 ) );
	float alpha = smoothstep( 0.03, 0.92, effect ) * uIntensity;

	gl_FragColor = vec4( col * ( 0.7 + effect * 1.6 ), alpha );
}
`;

const ARC_PULSE_FRAGMENT = `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uArcDensity;
uniform float uPulse;

varying vec2 vUv;

${ COMMON_GLSL }

void main() {
	vec2 p = ( vUv - 0.5 ) * 2.0;
	float r = length( p );
	float a = atan( p.y, p.x );

	float ringCenter = 0.34 + 0.04 * sin( uTime * uPulse );
	float ring = exp( - 72.0 * abs( r - ringCenter ) );

	float n = fbm21( vec2( a * 1.9, r * 9.0 + uTime * 0.5 ) + vec2( uTime * 0.8, - uTime * 1.2 ) );
	float arcShape = sin( a * uArcDensity + uTime * 5.0 + n * 3.0 );
	arcShape = pow( max( 0.0, arcShape ), 9.0 );

	float gate = smoothstep( 0.54, 0.9, fbm21( vec2( a * 4.5 + uTime * 2.0, r * 18.0 - uTime * 3.0 ) ) );
	float arcs = arcShape * gate * ( 1.0 - smoothstep( 0.08, 0.62, r ) );

	float sparks = smoothstep( 0.88, 0.99, fbm21( p * 24.0 + vec2( uTime * 2.2, - uTime * 1.7 ) ) );
	sparks *= smoothstep( 1.0, 0.2, r );

	float effect = ring * 1.15 + arcs * 0.95 + sparks * 0.38;
	vec3 col = mix( uColorB, uColorA, sat01( effect ) );
	float alpha = smoothstep( 0.05, 1.0, effect );

	gl_FragColor = vec4( col * ( 0.85 + effect * 1.55 ), alpha * 0.96 );
}
`;

const PORTAL_FRAGMENT = `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uSpin;
uniform float uSeed;

varying vec2 vUv;

${ COMMON_GLSL }

void main() {
	vec2 p = ( vUv - 0.5 ) * 2.0;
	float r = length( p );
	float a = atan( p.y, p.x );

	float n = fbm21( p * 6.0 + vec2( uTime * 0.2 + uSeed, - uTime * 0.15 ) );
	float spiral = 0.5 + 0.5 * sin( a * 10.0 - uTime * uSpin + r * 28.0 + n * 8.0 );
	float rings = 0.5 + 0.5 * sin( r * 95.0 - uTime * 4.2 + n * 6.0 );

	float core = 1.0 - smoothstep( 0.02, 0.52, r );
	float rim = exp( - 90.0 * abs( r - 0.44 ) );
	float vortex = core * ( 0.32 + spiral * 0.92 ) + rim * 1.45 + rings * 0.18 * core;

	float cut = smoothstep( 0.88, 0.0, r );
	float effect = vortex * cut;

	vec3 col = mix( uColorB, uColorA, sat01( spiral * 0.85 + core * 0.45 ) );
	float alpha = smoothstep( 0.06, 1.0, effect );

	gl_FragColor = vec4( col * ( 0.8 + effect * 1.9 ), alpha * 0.96 );
}
`;

const SUPERNOVA_FRAGMENT = `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uBurstPhase;

varying vec2 vUv;

${ COMMON_GLSL }

void main() {
	vec2 p = ( vUv - 0.5 ) * 2.0;
	float r = length( p );
	float a = atan( p.y, p.x );

	float phase = fract( uBurstPhase );
	float shockRadius = mix( 0.06, 0.88, phase );
	float shock = exp( - 120.0 * abs( r - shockRadius ) ) * ( 1.0 - phase * 0.7 );

	float n = fbm21( p * 12.0 + vec2( uTime * 0.55, - uTime * 0.44 ) );
	float rays = pow( max( 0.0, cos( a * 14.0 + n * 7.0 - uTime * 1.2 ) ), 18.0 );
	rays *= 1.0 - smoothstep( 0.15, 1.05, r );

	float core = exp( - 12.0 * r ) * ( 1.2 + phase * 1.7 );
	float debris = smoothstep( 0.82, 0.99, fbm21( p * 24.0 + vec2( - uTime * 1.6, uTime * 1.1 ) ) );
	debris *= smoothstep( 1.0, 0.15, r );

	float effect = core + rays * 0.85 + shock * 2.2 + debris * 0.3;
	vec3 col = mix( uColorB, uColorA, sat01( effect * 0.6 + core * 0.4 ) );
	float alpha = sat01( effect * 0.75 ) * ( 1.0 - smoothstep( 0.95, 1.2, r ) );

	gl_FragColor = vec4( col * ( 0.95 + effect * 1.75 ), alpha );
}
`;

const HALO_RING_FRAGMENT = `
uniform float uTime;
uniform vec3 uColor;
uniform float uRadius;
uniform float uWidth;
uniform float uSpeed;

varying vec2 vUv;

void main() {
	vec2 centered = vUv - 0.5;
	float radius = length( centered ) * 1.4142;
	float angle = atan( centered.y, centered.x );

	float edge = abs( radius - uRadius );
	float oscillation = 0.5 + 0.5 * sin( uTime * uSpeed + angle * 9.0 );
	float alpha = ( 1.0 - smoothstep( 0.0, uWidth, edge ) ) * ( 0.45 + oscillation * 0.55 );

	gl_FragColor = vec4( uColor * ( 0.8 + oscillation * 1.2 ), alpha );
}
`;

const PRESET_EFFECTS = {
	emberFlames: {
		type: 'tornado',
		color: '#ff9a45',
		shadow: '#120603',
		scale: { x: 1.95, y: 4.3, z: 1.95 },
		timeScale: 0.92,
		contrast: 1.35,
		wobble: 0.07
	},
	plasmaTornado: {
		type: 'tornado',
		color: '#ffc080',
		shadow: '#130406',
		scale: { x: 2.35, y: 5.5, z: 2.35 },
		timeScale: 1.08,
		contrast: 1.7,
		wobble: 0.1
	},
	linkedNebula: {
		type: 'nebula',
		colorA: '#9fd5ff',
		colorB: '#6c46f5',
		intensity: 0.95
	},
	arcPulse: {
		type: 'arc',
		colorA: '#7cf1ff',
		colorB: '#1545b7',
		density: 18.0,
		pulse: 3.1
	},
	vortexPortal: {
		type: 'portal',
		colorA: '#4ab1ff',
		colorB: '#2a0a58',
		spin: 5.2
	},
	supernovaBurst: {
		type: 'supernova',
		colorA: '#ffd978',
		colorB: '#8b1b10',
		burstSpeed: 0.33
	}
};

function disposeMaterial( material ) {

	if ( Array.isArray( material ) ) {

		material.forEach( disposeMaterial );
		return;

	}

	if ( material && typeof material.dispose === 'function' ) material.dispose();

}

function disposeObjectTree( object ) {

	object.traverse( ( child ) => {

		if ( child.geometry && typeof child.geometry.dispose === 'function' ) child.geometry.dispose();
		if ( child.material ) disposeMaterial( child.material );

	} );

}

function makeColor( value, fallback ) {

	try {

		return new THREE.Color( value );

	} catch ( error ) {

		return new THREE.Color( fallback );

	}

}

function createShaderMaterial( params ) {

	return new THREE.ShaderMaterial( {
		uniforms: params.uniforms,
		vertexShader: params.vertexShader || BILLBOARD_VERTEX,
		fragmentShader: params.fragmentShader,
		transparent: params.transparent !== undefined ? params.transparent : true,
		side: params.side || THREE.DoubleSide,
		depthWrite: params.depthWrite === true,
		depthTest: params.depthTest !== false,
		blending: params.blending || THREE.AdditiveBlending,
		toneMapped: params.toneMapped === true
	} );

}

export class WebGLVFXLab {

	constructor( scene, camera = null ) {

		this.scene = scene;
		this.camera = camera;
		this.group = new THREE.Group();
		this.group.name = 'webgl-vfx-lab';
		this.group.renderOrder = 12;
		this.scene.add( this.group );

		this.activePreset = null;
		this.updaters = [];
		this.billboards = [];

	}

	clear() {

		this.updaters = [];
		this.billboards = [];

		for ( let i = this.group.children.length - 1; i >= 0; i -- ) {

			const child = this.group.children[ i ];
			this.group.remove( child );
			disposeObjectTree( child );

		}

		this.activePreset = null;

	}

	applyPreset( presetName ) {

		const config = PRESET_EFFECTS[ presetName ];
		if ( ! config ) {

			this.clear();
			return false;

		}

		if ( this.activePreset === presetName ) return true;

		this.clear();

		switch ( config.type ) {

			case 'tornado':
				this._createTornado( config );
				break;
			case 'nebula':
				this._createNebula( config );
				break;
			case 'arc':
				this._createArcPulse( config );
				break;
			case 'portal':
				this._createPortal( config );
				break;
			case 'supernova':
				this._createSupernova( config );
				break;
			default:
				this._createNebula( {
					colorA: '#9fd5ff',
					colorB: '#6c46f5',
					intensity: 0.95
				} );
				break;

		}

		this.activePreset = presetName;
		return true;

	}

	update( delta ) {

		if ( this.billboards.length > 0 && this.camera ) {

			for ( let i = 0; i < this.billboards.length; i ++ ) {

				this.billboards[ i ].quaternion.copy( this.camera.quaternion );

			}

		}

		if ( this.updaters.length === 0 ) return;
		for ( let i = 0; i < this.updaters.length; i ++ ) {

			this.updaters[ i ]( delta );

		}

	}

	dispose() {

		this.clear();
		if ( this.group.parent ) this.group.parent.remove( this.group );

	}

	_createBillboardPlane( size, material, y = 2.0, z = 0 ) {

		const mesh = new THREE.Mesh( new THREE.PlaneGeometry( size, size ), material );
		mesh.position.set( 0, y, z );
		mesh.renderOrder = 14;
		this.group.add( mesh );
		this.billboards.push( mesh );
		return mesh;

	}

	_createHaloRing( color, radius, width, speed, size, y, z = 0 ) {

		const uniforms = {
			uTime: { value: 0 },
			uColor: { value: color.clone() },
			uRadius: { value: radius },
			uWidth: { value: width },
			uSpeed: { value: speed }
		};
		const material = createShaderMaterial( {
			uniforms,
			fragmentShader: HALO_RING_FRAGMENT,
			depthTest: false
		} );
		const ring = this._createBillboardPlane( size, material, y, z );
		return { ring, uniforms };

	}

	_createTornado( config ) {

		const glowColor = makeColor( config.color, '#ff9a45' );
		const shadowColor = makeColor( config.shadow, '#120603' );
		const twisterScale = config.scale || { x: 2.0, y: 4.8, z: 2.0 };
		const timeScale = config.timeScale || 1.0;
		const contrast = config.contrast || 1.45;
		const wobble = config.wobble || 0.08;

		const floorUniforms = {
			uTime: { value: 0 },
			uColor: { value: glowColor.clone().multiplyScalar( 0.75 ) },
			uIntensity: { value: 1.0 }
		};
		const floorMaterial = createShaderMaterial( {
			uniforms: floorUniforms,
			fragmentShader: FLOOR_SWIRL_FRAGMENT,
			depthTest: true
		} );
		const floor = new THREE.Mesh( new THREE.PlaneGeometry( 13, 13 ), floorMaterial );
		floor.rotation.x = - Math.PI * 0.5;
		floor.position.y = - 0.02;
		floor.renderOrder = 8;
		this.group.add( floor );

		const cylinderGeometry = new THREE.CylinderGeometry( 1, 1, 1, 36, 44, true );
		cylinderGeometry.translate( 0, 0.5, 0 );

		const baseUniforms = {
			uTime: { value: 0 },
			uTwistSpeed: { value: 0.22 * timeScale },
			uParabolaStrength: { value: 1.0 },
			uParabolaOffset: { value: 0.28 },
			uParabolaAmplitude: { value: 0.2 },
			uWobble: { value: wobble }
		};

		const coreUniforms = {
			...baseUniforms,
			uColor: { value: glowColor.clone() },
			uContrast: { value: contrast }
		};
		const coreMaterial = createShaderMaterial( {
			uniforms: coreUniforms,
			vertexShader: TWISTER_VERTEX,
			fragmentShader: TORNADO_CORE_FRAGMENT,
			blending: THREE.AdditiveBlending,
			depthTest: true
		} );
		const core = new THREE.Mesh( cylinderGeometry, coreMaterial );
		core.scale.set( twisterScale.x, twisterScale.y, twisterScale.z );
		core.position.y = 0.02;
		core.renderOrder = 10;
		this.group.add( core );

		const shadowUniforms = {
			...baseUniforms,
			uParabolaAmplitude: { value: Math.max( 0.08, baseUniforms.uParabolaAmplitude.value - 0.06 ) },
			uColor: { value: shadowColor.clone() }
		};
		const shadowMaterial = createShaderMaterial( {
			uniforms: shadowUniforms,
			vertexShader: TWISTER_VERTEX,
			fragmentShader: TORNADO_SHADOW_FRAGMENT,
			blending: THREE.NormalBlending,
			depthTest: true,
			toneMapped: true
		} );
		const shadow = new THREE.Mesh( cylinderGeometry.clone(), shadowMaterial );
		shadow.scale.copy( core.scale ).multiplyScalar( 1.09 );
		shadow.position.copy( core.position );
		shadow.renderOrder = 9;
		this.group.add( shadow );

		const halo = this._createHaloRing(
			glowColor.clone().multiplyScalar( 0.9 ),
			0.4,
			0.07,
			2.6,
			6.2,
			0.12,
			0
		);

		this.updaters.push( ( delta ) => {

			const advance = delta;
			floorUniforms.uTime.value += advance;
			coreUniforms.uTime.value += advance;
			shadowUniforms.uTime.value += advance;
			halo.uniforms.uTime.value += advance;
			halo.ring.rotation.z += delta * 0.18;

		} );

	}

	_createNebula( config ) {

		const colorA = makeColor( config.colorA, '#9fd5ff' );
		const colorB = makeColor( config.colorB, '#6c46f5' );
		const intensity = config.intensity || 1.0;

		const layerAUniforms = {
			uTime: { value: 0 },
			uColorA: { value: colorA.clone() },
			uColorB: { value: colorB.clone() },
			uSeed: { value: 0.27 },
			uIntensity: { value: intensity }
		};
		const layerAMaterial = createShaderMaterial( {
			uniforms: layerAUniforms,
			fragmentShader: NEBULA_FRAGMENT,
			depthTest: false
		} );
		const layerA = this._createBillboardPlane( 8.8, layerAMaterial, 2.0, 0 );

		const layerBUniforms = {
			uTime: { value: 0 },
			uColorA: { value: colorA.clone().multiplyScalar( 0.85 ) },
			uColorB: { value: colorB.clone().multiplyScalar( 0.8 ) },
			uSeed: { value: 1.73 },
			uIntensity: { value: intensity * 0.72 }
		};
		const layerBMaterial = createShaderMaterial( {
			uniforms: layerBUniforms,
			fragmentShader: NEBULA_FRAGMENT,
			depthTest: false
		} );
		const layerB = this._createBillboardPlane( 11.8, layerBMaterial, 2.0, - 0.55 );

		const halo = this._createHaloRing(
			colorA.clone().lerp( colorB, 0.45 ),
			0.33,
			0.085,
			1.9,
			7.2,
			2.0,
			0.1
		);

		this.updaters.push( ( delta ) => {

			layerAUniforms.uTime.value += delta;
			layerBUniforms.uTime.value += delta * 0.82;
			halo.uniforms.uTime.value += delta;
			layerA.rotation.z += delta * 0.05;
			layerB.rotation.z -= delta * 0.03;

		} );

	}

	_createArcPulse( config ) {

		const colorA = makeColor( config.colorA, '#7cf1ff' );
		const colorB = makeColor( config.colorB, '#1545b7' );
		const density = config.density || 16.0;
		const pulse = config.pulse || 3.0;

		const arcUniformsA = {
			uTime: { value: 0 },
			uColorA: { value: colorA.clone() },
			uColorB: { value: colorB.clone() },
			uArcDensity: { value: density },
			uPulse: { value: pulse }
		};
		const arcMaterialA = createShaderMaterial( {
			uniforms: arcUniformsA,
			fragmentShader: ARC_PULSE_FRAGMENT,
			depthTest: false
		} );
		const arcA = this._createBillboardPlane( 7.4, arcMaterialA, 2.1, 0 );

		const arcUniformsB = {
			uTime: { value: 0 },
			uColorA: { value: colorA.clone().multiplyScalar( 0.9 ) },
			uColorB: { value: colorB.clone().multiplyScalar( 0.7 ) },
			uArcDensity: { value: density * 0.72 },
			uPulse: { value: pulse * 1.35 }
		};
		const arcMaterialB = createShaderMaterial( {
			uniforms: arcUniformsB,
			fragmentShader: ARC_PULSE_FRAGMENT,
			depthTest: false
		} );
		const arcB = this._createBillboardPlane( 9.2, arcMaterialB, 2.1, - 0.25 );

		const halo = this._createHaloRing(
			colorA.clone(),
			0.34,
			0.06,
			4.2,
			7.2,
			2.1,
			0.2
		);

		this.updaters.push( ( delta ) => {

			arcUniformsA.uTime.value += delta;
			arcUniformsB.uTime.value += delta * 1.18;
			halo.uniforms.uTime.value += delta;
			arcA.rotation.z += delta * 0.15;
			arcB.rotation.z -= delta * 0.19;

		} );

	}

	_createPortal( config ) {

		const colorA = makeColor( config.colorA, '#4ab1ff' );
		const colorB = makeColor( config.colorB, '#2a0a58' );
		const spin = config.spin || 5.0;

		const portalUniformsA = {
			uTime: { value: 0 },
			uColorA: { value: colorA.clone() },
			uColorB: { value: colorB.clone() },
			uSpin: { value: spin },
			uSeed: { value: 0.41 }
		};
		const portalMaterialA = createShaderMaterial( {
			uniforms: portalUniformsA,
			fragmentShader: PORTAL_FRAGMENT,
			depthTest: false
		} );
		const portalA = this._createBillboardPlane( 8.1, portalMaterialA, 2.2, 0 );

		const portalUniformsB = {
			uTime: { value: 0 },
			uColorA: { value: colorA.clone().multiplyScalar( 0.85 ) },
			uColorB: { value: colorB.clone().multiplyScalar( 0.75 ) },
			uSpin: { value: - spin * 0.8 },
			uSeed: { value: 1.29 }
		};
		const portalMaterialB = createShaderMaterial( {
			uniforms: portalUniformsB,
			fragmentShader: PORTAL_FRAGMENT,
			depthTest: false
		} );
		const portalB = this._createBillboardPlane( 9.6, portalMaterialB, 2.2, - 0.35 );

		const halo = this._createHaloRing(
			colorA.clone().lerp( colorB, 0.25 ),
			0.43,
			0.055,
			3.0,
			8.8,
			2.2,
			0.16
		);

		this.updaters.push( ( delta ) => {

			portalUniformsA.uTime.value += delta;
			portalUniformsB.uTime.value += delta;
			halo.uniforms.uTime.value += delta;
			portalA.rotation.z += delta * 0.05;
			portalB.rotation.z -= delta * 0.07;

		} );

	}

	_createSupernova( config ) {

		const colorA = makeColor( config.colorA, '#ffd978' );
		const colorB = makeColor( config.colorB, '#8b1b10' );
		const burstSpeed = config.burstSpeed || 0.3;

		const starUniforms = {
			uTime: { value: 0 },
			uColorA: { value: colorA.clone() },
			uColorB: { value: colorB.clone() },
			uBurstPhase: { value: 0 }
		};
		const starMaterial = createShaderMaterial( {
			uniforms: starUniforms,
			fragmentShader: SUPERNOVA_FRAGMENT,
			depthTest: false
		} );
		const star = this._createBillboardPlane( 8.8, starMaterial, 2.1, 0 );

		const halo = this._createHaloRing(
			colorA.clone().lerp( colorB, 0.35 ),
			0.3,
			0.07,
			4.6,
			7.6,
			2.1,
			0.14
		);

		this.updaters.push( ( delta ) => {

			starUniforms.uTime.value += delta;
			starUniforms.uBurstPhase.value += delta * burstSpeed;
			halo.uniforms.uTime.value += delta;
			const phase = starUniforms.uBurstPhase.value % 1;
			halo.uniforms.uRadius.value = 0.22 + phase * 0.32;
			star.rotation.z += delta * 0.08;

		} );

	}

}
