import { Fn, float, vec2, uv, sin, cos, atan2, abs, smoothstep, step, length, max, min, PI } from 'three/tsl';
import { hash } from '../utils/NoiseLibrary.js';

const TWO_PI = float( Math.PI * 2 );

// Soft circle - smooth falloff from center
export const shapeCircleSoft = Fn( () => {
	const center = uv().sub( 0.5 );
	const dist = center.length();
	return smoothstep( float( 0.5 ), float( 0.1 ), dist );
} );

// Hard circle - crisp edge
export const shapeCircleHard = Fn( () => {
	const center = uv().sub( 0.5 );
	const dist = center.length();
	return step( dist, float( 0.45 ) );
} );

// Star shape - 5 pointed star using polar coordinates
export const shapeStar = Fn( () => {
	const center = uv().sub( 0.5 );
	const angle = atan2( center.y, center.x );
	const dist = center.length();

	// Star ray modulation
	const rays = sin( angle.mul( 5.0 ) ).mul( 0.5 ).add( 0.5 );
	const starRadius = float( 0.2 ).add( rays.mul( 0.25 ) );

	return smoothstep( starRadius.add( 0.05 ), starRadius, dist );
} );

// Smoke - soft blobby shape
export const shapeSmoke = Fn( () => {
	const center = uv().sub( 0.5 );
	const dist = center.length();

	// Distort the circle slightly for organic look
	const angle = atan2( center.y, center.x );
	const distortion = sin( angle.mul( 3.0 ) ).mul( 0.05 )
		.add( sin( angle.mul( 7.0 ) ).mul( 0.03 ) );

	const modDist = dist.add( distortion );
	return smoothstep( float( 0.5 ), float( 0.0 ), modDist ).mul(
		smoothstep( float( 0.0 ), float( 0.15 ), float( 0.5 ).sub( modDist ) )
	);
} );

// Spark - elongated horizontal line
export const shapeSpark = Fn( () => {
	const center = uv().sub( 0.5 );
	// Stretch horizontally
	const stretched = vec2( center.x.mul( 0.5 ), center.y.mul( 3.0 ) );
	const dist = stretched.length();
	return smoothstep( float( 0.5 ), float( 0.0 ), dist );
} );

// Diamond shape
export const shapeDiamond = Fn( () => {
	const center = uv().sub( 0.5 );
	const dist = abs( center.x ).add( abs( center.y ) );
	return smoothstep( float( 0.5 ), float( 0.35 ), dist );
} );

// Ring/Donut shape
export const shapeRing = Fn( () => {
	const center = uv().sub( 0.5 );
	const dist = center.length();
	return smoothstep( float( 0.5 ), float( 0.4 ), dist ).mul(
		smoothstep( float( 0.15 ), float( 0.25 ), dist )
	);
} );

// Heart shape using polar formula
export const shapeHeart = Fn( () => {
	const center = uv().sub( vec2( 0.5, 0.4 ) );
	const p = vec2( abs( center.x ), center.y.negate() );
	const dist = length( p.sub( vec2( 0, max( p.y.mul( 0.5 ), p.x.sub( p.y ) ) ) ) );
	return smoothstep( float( 0.35 ), float( 0.3 ), dist );
} );

// Shape names for UI
export const PARTICLE_SHAPES = [
	'Soft Circle',
	'Hard Circle',
	'Star',
	'Smoke',
	'Spark',
	'Diamond',
	'Ring',
	'Heart'
];

// Get shape function by index
export function getShapeByIndex( index ) {
	const shapes = [
		shapeCircleSoft,
		shapeCircleHard,
		shapeStar,
		shapeSmoke,
		shapeSpark,
		shapeDiamond,
		shapeRing,
		shapeHeart
	];
	return shapes[ index ] || shapeCircleSoft;
}
