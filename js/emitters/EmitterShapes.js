import { Fn, float, vec2, vec3, sin, cos, sqrt, atan2, PI, If } from 'three/tsl';
import { hash, hash2, hash3 } from '../utils/NoiseLibrary.js';

const TWO_PI = float( Math.PI * 2 );

// Point emitter - all particles from origin
export const pointEmitter = Fn( ( [ origin, seed ] ) => {
	return origin;
} );

// Sphere emitter - uniform volume distribution
export const sphereEmitter = Fn( ( [ origin, radius, seed ] ) => {
	const h = hash3( seed );

	// Uniform sphere distribution: cube root for uniform volume
	const r = h.z.pow( float( 1.0 / 3.0 ) ).mul( radius );
	const theta = h.x.mul( TWO_PI );
	const phi = h.y.mul( PI );

	return origin.add( vec3(
		r.mul( sin( phi ) ).mul( cos( theta ) ),
		r.mul( cos( phi ) ),
		r.mul( sin( phi ) ).mul( sin( theta ) )
	) );
} );

// Box emitter - uniform box distribution
export const boxEmitter = Fn( ( [ origin, halfExtents, seed ] ) => {
	const h = hash3( seed );
	return origin.add( vec3(
		h.x.mul( 2.0 ).sub( 1.0 ).mul( halfExtents.x ),
		h.y.mul( 2.0 ).sub( 1.0 ).mul( halfExtents.y ),
		h.z.mul( 2.0 ).sub( 1.0 ).mul( halfExtents.z )
	) );
} );

// Cone emitter - particles emitted in cone shape
export const coneEmitter = Fn( ( [ origin, angle, height, seed ] ) => {
	const h = hash3( seed );
	const t = h.x; // 0..1 along height
	const currentHeight = t.mul( height );
	const currentRadius = currentHeight.mul( angle ); // angle as tan ratio
	const theta = h.y.mul( TWO_PI );
	const radiusFactor = sqrt( h.z ); // sqrt for uniform disk distribution

	return origin.add( vec3(
		cos( theta ).mul( currentRadius ).mul( radiusFactor ),
		currentHeight,
		sin( theta ).mul( currentRadius ).mul( radiusFactor )
	) );
} );

// Ring/Torus emitter
export const ringEmitter = Fn( ( [ origin, majorRadius, minorRadius, seed ] ) => {
	const h = hash3( seed );
	const theta = h.x.mul( TWO_PI ); // around the ring
	const phi = h.y.mul( TWO_PI );   // around the tube
	const r = majorRadius.add( cos( phi ).mul( minorRadius ) );

	return origin.add( vec3(
		cos( theta ).mul( r ),
		sin( phi ).mul( minorRadius ),
		sin( theta ).mul( r )
	) );
} );

// Spiral emitter - helix/spiral distribution
export const spiralEmitter = Fn( ( [ origin, radius, turns, height, seed ] ) => {
	const h = hash3( seed );
	const t = h.x; // position along spiral 0..1
	const angle = t.mul( turns ).mul( TWO_PI );
	const currentRadius = t.mul( radius );
	const spread = h.y.sub( 0.5 ).mul( 0.2 ); // slight radial spread

	return origin.add( vec3(
		cos( angle ).mul( currentRadius.add( spread ) ),
		t.mul( height ).sub( height.mul( 0.5 ) ),
		sin( angle ).mul( currentRadius.add( spread ) )
	) );
} );

// Disk emitter - flat circular disk
export const diskEmitter = Fn( ( [ origin, radius, seed ] ) => {
	const h = hash2( seed );
	const theta = h.x.mul( TWO_PI );
	const r = sqrt( h.y ).mul( radius ); // sqrt for uniform disk distribution

	return origin.add( vec3(
		cos( theta ).mul( r ),
		float( 0.0 ),
		sin( theta ).mul( r )
	) );
} );

// Initial velocity direction based on emitter shape
export const getEmitVelocity = Fn( ( [ emitterType, position, origin, speed, spread, seed ] ) => {
	const h = hash3( seed.add( 42.0 ) );
	const dir = vec3( 0, 1, 0 ).toVar(); // default: upward

	// Spread randomization
	const randomOffset = vec3(
		h.x.sub( 0.5 ).mul( spread ),
		h.y.sub( 0.5 ).mul( spread ),
		h.z.sub( 0.5 ).mul( spread )
	);

	// For sphere: radial direction
	If( emitterType.equal( 1 ), () => {
		const fromCenter = position.sub( origin );
		const len = fromCenter.length().max( 0.001 );
		dir.assign( fromCenter.div( len ) );
	} );

	// For cone: upward with slight outward spread
	If( emitterType.equal( 3 ), () => {
		dir.assign( vec3( 0, 1, 0 ) );
	} );

	// For ring: tangential + outward
	If( emitterType.equal( 4 ), () => {
		const fromCenter = vec3( position.x.sub( origin.x ), 0, position.z.sub( origin.z ) );
		const len = fromCenter.length().max( 0.001 );
		dir.assign( vec3( fromCenter.x.div( len ), 0.5, fromCenter.z.div( len ) ).normalize() );
	} );

	const finalDir = dir.add( randomOffset ).normalize();
	return finalDir.mul( speed );
} );

// Emitter shape names for UI
export const EMITTER_SHAPES = [
	'Point',
	'Sphere',
	'Box',
	'Cone',
	'Ring',
	'Spiral',
	'Disk'
];
