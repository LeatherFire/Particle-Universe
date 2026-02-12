import { Fn, float, vec2, vec3, normalize, length, max, min, mix, clamp, If, time } from 'three/tsl';
import { curlNoise3D } from '../utils/NoiseLibrary.js';

// Apply all forces to a particle and return new velocity
export const applyAllForces = Fn( ( [
	velocity, position, deltaTime,
	gravityStrength, gravityDirection,
	windStrength, windDirection,
	turbulenceStrength, turbulenceScale, turbulenceSpeed,
	vortexStrength, vortexAxis,
	attractorEnabled, attractorPosition, attractorStrength,
	dragCoefficient,
	funnelStrength, funnelBaseRadius, funnelTopRadius, funnelHeight, emitterOrigin
] ) => {
	const vel = velocity.toVar();

	// 1. Gravity
	vel.addAssign( gravityDirection.mul( gravityStrength ).mul( deltaTime ) );

	// 2. Wind
	vel.addAssign( windDirection.mul( windStrength ).mul( deltaTime ) );

	// 3. Turbulence (curl noise)
	const noisePos = position.mul( turbulenceScale ).add(
		vec3( 0, time.mul( turbulenceSpeed ), 0 )
	);
	const turbForce = curlNoise3D( noisePos ).mul( turbulenceStrength );
	vel.addAssign( turbForce.mul( deltaTime ) );

	// 4. Vortex (tangential force around vortex axis, assumed Y axis)
	const toAxis = vec3( position.x, 0, position.z ).toVar();
	const dist = toAxis.length().max( 0.01 );
	// Tangent direction (perpendicular to radial in XZ plane)
	const tangent = normalize( vec3( toAxis.z.negate(), float( 0 ), toAxis.x ) );
	// Vortex force inversely proportional to distance (with falloff cap)
	const vortexForce = tangent.mul( vortexStrength ).div( dist.add( 0.5 ) );
	vel.addAssign( vortexForce.mul( deltaTime ) );

	// 5. Funnel confinement (keeps flow on a tapered radius profile)
	If( funnelStrength.greaterThan( 0.001 ), () => {
		const radial = vec2(
			position.x.sub( emitterOrigin.x ),
			position.z.sub( emitterOrigin.z )
		);
		const radialDist = radial.length().max( 0.001 );
		const radialDir = vec3(
			radial.x.div( radialDist ),
			0.0,
			radial.y.div( radialDist )
		);

		const heightT = clamp(
			position.y.sub( emitterOrigin.y ).add( funnelHeight.mul( 0.5 ) ).div( funnelHeight.max( 0.001 ) ),
			0.0,
			1.0
		);
		const targetRadius = mix( funnelBaseRadius, funnelTopRadius, heightT );
		const radiusError = targetRadius.sub( radialDist );
		const funnelForce = radialDir.mul( radiusError.mul( funnelStrength ) );
		vel.addAssign( funnelForce.mul( deltaTime ) );
	} );

	// 6. Attractor/Repeller
	If( attractorEnabled.greaterThan( 0.5 ), () => {
		const toAttractor = attractorPosition.sub( position );
		const attractDist = toAttractor.length().max( 0.1 );
		const attractDir = toAttractor.div( attractDist );
		// Inverse square law with clamped minimum distance
		const attractForce = attractDir.mul( attractorStrength ).div( attractDist.mul( attractDist ).add( 0.5 ) );
		vel.addAssign( attractForce.mul( deltaTime ) );
	} );

	// 7. Drag (velocity dampening)
	vel.mulAssign( float( 1.0 ).sub( dragCoefficient.mul( deltaTime ) ).max( 0.0 ) );

	return vel;
} );
