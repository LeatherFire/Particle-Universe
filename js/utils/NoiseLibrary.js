import { Fn, float, vec2, vec3, vec4, floor, fract, sin, cos, dot, mix, abs, clamp } from 'three/tsl';

// High quality hash function for pseudo-random numbers on GPU
export const hash = Fn( ( [ seed ] ) => {
	return fract( sin( seed.mul( 78.233 ).add( 12.9898 ) ).mul( 43758.5453 ) );
} );

export const hash2 = Fn( ( [ seed ] ) => {
	const x = hash( seed );
	const y = hash( seed.add( 127.1 ) );
	return vec2( x, y );
} );

export const hash3 = Fn( ( [ seed ] ) => {
	const x = hash( seed );
	const y = hash( seed.add( 127.1 ) );
	const z = hash( seed.add( 269.5 ) );
	return vec3( x, y, z );
} );

// Value noise 3D using hash
export const valueNoise3D = Fn( ( [ p ] ) => {
	const i = floor( p );
	const f = fract( p );

	// Smoothstep interpolation
	const u = f.mul( f ).mul( float( 3.0 ).sub( f.mul( 2.0 ) ) );

	// Hash at 8 corners of cube
	const n = i.x.add( i.y.mul( 157.0 ) ).add( i.z.mul( 113.0 ) );

	const a = hash( n );
	const b = hash( n.add( 1.0 ) );
	const c = hash( n.add( 157.0 ) );
	const d = hash( n.add( 158.0 ) );
	const e = hash( n.add( 113.0 ) );
	const f2 = hash( n.add( 114.0 ) );
	const g = hash( n.add( 270.0 ) );
	const h2 = hash( n.add( 271.0 ) );

	return mix(
		mix( mix( a, b, u.x ), mix( c, d, u.x ), u.y ),
		mix( mix( e, f2, u.x ), mix( g, h2, u.x ), u.y ),
		u.z
	);
} );

// Curl noise 3D for divergence-free turbulence
export const curlNoise3D = Fn( ( [ p ] ) => {
	const eps = float( 0.01 );

	// Finite difference derivatives
	const px1 = valueNoise3D( p.add( vec3( eps, 0, 0 ) ) );
	const px2 = valueNoise3D( p.sub( vec3( eps, 0, 0 ) ) );
	const py1 = valueNoise3D( p.add( vec3( 0, eps, 0 ) ) );
	const py2 = valueNoise3D( p.sub( vec3( 0, eps, 0 ) ) );
	const pz1 = valueNoise3D( p.add( vec3( 0, 0, eps ) ) );
	const pz2 = valueNoise3D( p.sub( vec3( 0, 0, eps ) ) );

	const dx = px1.sub( px2 );
	const dy = py1.sub( py2 );
	const dz = pz1.sub( pz2 );

	// Curl = nabla x F (cross product of gradient)
	return vec3(
		dz.sub( dy ),
		dx.sub( dz ),
		dy.sub( dx )
	).div( eps.mul( 2.0 ) );
} );

// FBM (Fractal Brownian Motion) for multi-octave noise
export const fbm3D = Fn( ( [ p, octaves ] ) => {
	const value = float( 0.0 ).toVar();
	const amplitude = float( 0.5 ).toVar();
	const frequency = float( 1.0 ).toVar();
	const pos = p.toVar();

	// Unrolled 4 octaves (can't use dynamic loop count easily in TSL)
	value.addAssign( valueNoise3D( pos.mul( frequency ) ).mul( amplitude ) );
	amplitude.mulAssign( 0.5 );
	frequency.mulAssign( 2.0 );

	value.addAssign( valueNoise3D( pos.mul( frequency ) ).mul( amplitude ) );
	amplitude.mulAssign( 0.5 );
	frequency.mulAssign( 2.0 );

	value.addAssign( valueNoise3D( pos.mul( frequency ) ).mul( amplitude ) );
	amplitude.mulAssign( 0.5 );
	frequency.mulAssign( 2.0 );

	value.addAssign( valueNoise3D( pos.mul( frequency ) ).mul( amplitude ) );

	return value;
} );
