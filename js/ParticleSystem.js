import * as THREE from 'three/webgpu';
import {
	Fn, float, int, vec2, vec3, vec4, color,
	uniform, uniformArray,
	instanceIndex, instancedArray, storage,
	time, deltaTime,
	If, Loop, min, max, mix, clamp, floor, fract, step, smoothstep,
	sin, cos, atan2, sqrt, abs, normalize, length,
	PI
} from 'three/tsl';

import { hash, hash3, curlNoise3D } from './utils/NoiseLibrary.js';
import {
	pointEmitter, sphereEmitter, boxEmitter, coneEmitter,
	ringEmitter, spiralEmitter, diskEmitter, getEmitVelocity
} from './emitters/EmitterShapes.js';
import { applyAllForces } from './forces/ForceFields.js';
import { getShapeByIndex } from './rendering/ParticleRenderer.js';

const MAX_PARTICLES = 200000;
const DEFAULT_ACTIVE_PARTICLES = 100000;

export class ParticleSystem {

	constructor( renderer, scene ) {

		this.renderer = renderer;
		this.scene = scene;
		this.mesh = null;
		this.material = null;
		this.maxParticles = MAX_PARTICLES;

		this._createUniforms();
		this._createBuffers();
		this._createComputeShaders();
		this._createMesh();

	}

	_createUniforms() {

		// --- Emitter uniforms ---
		this.uniforms = {
			// Emitter
			activeParticleCount: uniform( DEFAULT_ACTIVE_PARTICLES ),
			emitterType: uniform( 0 ),
			emitterOrigin: uniform( new THREE.Vector3( 0, 0, 0 ) ),
			emitterRadius: uniform( 1.0 ),
			emitterAngle: uniform( 0.3 ),
			emitterHeight: uniform( 1.0 ),
			emitterHalfExtents: uniform( new THREE.Vector3( 1, 1, 1 ) ),
			emitterMajorRadius: uniform( 1.0 ),
			emitterMinorRadius: uniform( 0.2 ),
			emitterTurns: uniform( 3.0 ),

			// Lifetime & speed
			lifetimeMin: uniform( 1.0 ),
			lifetimeMax: uniform( 3.0 ),
			initialSpeedMin: uniform( 1.0 ),
			initialSpeedMax: uniform( 3.0 ),
			initialSpread: uniform( 0.5 ),
			startSize: uniform( 0.05 ),
			rotationSpeed: uniform( 0.0 ),

			// Forces
			gravityStrength: uniform( 5.0 ),
			gravityDirection: uniform( new THREE.Vector3( 0, - 1, 0 ) ),
			windStrength: uniform( 0.0 ),
			windDirection: uniform( new THREE.Vector3( 1, 0, 0 ) ),
			turbulenceStrength: uniform( 1.0 ),
			turbulenceScale: uniform( 0.5 ),
			turbulenceSpeed: uniform( 1.0 ),
			vortexStrength: uniform( 0.0 ),
			vortexAxis: uniform( new THREE.Vector3( 0, 1, 0 ) ),
			attractorEnabled: uniform( 0.0 ),
			attractorPosition: uniform( new THREE.Vector3( 0, 2, 0 ) ),
			attractorStrength: uniform( 5.0 ),
			dragCoefficient: uniform( 0.1 ),
			funnelStrength: uniform( 0.0 ),
			funnelBaseRadius: uniform( 0.35 ),
			funnelTopRadius: uniform( 2.4 ),
			funnelHeight: uniform( 6.0 ),

			// Visual
			particleShapeType: uniform( 0 ),
			velocityStretch: uniform( 0.0 ),
			velocityStretchFactor: uniform( 0.35 ),
			velocityStretchMin: uniform( 1.0 ),
			velocityStretchMax: uniform( 8.0 ),
			alignToVelocity: uniform( 0.0 ),

			// Frame seed for randomization
			frameSeed: uniform( 0.0 ),
		};

		// Color gradient (up to 8 stops)
		this.gradientColors = uniformArray(
			[
				new THREE.Color( '#ffffff' ),
				new THREE.Color( '#ffaa33' ),
				new THREE.Color( '#ff4400' ),
				new THREE.Color( '#110000' ),
				new THREE.Color( '#000000' ),
				new THREE.Color( '#000000' ),
				new THREE.Color( '#000000' ),
				new THREE.Color( '#000000' ),
			], 'vec3'
		);
		this.gradientPositions = uniformArray(
			[ 0.0, 0.3, 0.6, 1.0, 1.0, 1.0, 1.0, 1.0 ], 'float'
		);
		this.gradientStopCount = uniform( 4 );

		// Size over lifetime curve (32 samples)
		const defaultSizeCurve = new Array( 32 ).fill( 0 ).map( ( _, i ) => {
			const t = i / 31;
			return Math.sin( t * Math.PI );
		} );
		this.sizeCurveData = uniformArray( defaultSizeCurve, 'float' );

		// Opacity over lifetime curve (32 samples)
		const defaultOpacityCurve = new Array( 32 ).fill( 0 ).map( ( _, i ) => {
			const t = i / 31;
			return t < 0.1 ? t * 10 : Math.max( 0, 1 - ( t - 0.1 ) / 0.9 );
		} );
		this.opacityCurveData = uniformArray( defaultOpacityCurve, 'float' );

	}

	_createBuffers() {

		// GPU-persistent storage buffers (Structure of Arrays for cache coherence)
		this.positionBuffer = instancedArray( MAX_PARTICLES, 'vec3' );
		this.velocityBuffer = instancedArray( MAX_PARTICLES, 'vec3' );
		this.colorBuffer = instancedArray( MAX_PARTICLES, 'vec4' );
		this.lifeBuffer = instancedArray( MAX_PARTICLES, 'vec2' ); // x=age, y=maxLife
		this.sizeBuffer = instancedArray( MAX_PARTICLES, 'float' );
		this.stretchBuffer = instancedArray( MAX_PARTICLES, 'float' );
		this.rotationBuffer = instancedArray( MAX_PARTICLES, 'float' );
		this.seedBuffer = instancedArray( MAX_PARTICLES, 'float' );

	}

	_createComputeShaders() {

		const u = this.uniforms;
		const positionBuffer = this.positionBuffer;
		const velocityBuffer = this.velocityBuffer;
		const colorBuffer = this.colorBuffer;
		const lifeBuffer = this.lifeBuffer;
		const sizeBuffer = this.sizeBuffer;
		const stretchBuffer = this.stretchBuffer;
		const rotationBuffer = this.rotationBuffer;
		const seedBuffer = this.seedBuffer;
		const gradientColors = this.gradientColors;
		const gradientPositions = this.gradientPositions;
		const gradientStopCount = this.gradientStopCount;
		const sizeCurveData = this.sizeCurveData;
		const opacityCurveData = this.opacityCurveData;

		// ===================== COMPUTE INIT =====================
		this.computeInit = Fn( () => {

			const idx = instanceIndex;

			// Seed each particle with unique random
			const seed = float( idx ).mul( 0.001 ).add( 42.0 );
			seedBuffer.element( idx ).assign( seed );

			// Spread particles randomly, set age > lifetime so they respawn
			const h = hash3( seed );
			positionBuffer.element( idx ).assign( vec3(
				h.x.sub( 0.5 ).mul( 4.0 ),
				h.y.mul( 3.0 ),
				h.z.sub( 0.5 ).mul( 4.0 )
			) );
			velocityBuffer.element( idx ).assign( vec3( 0, 0, 0 ) );
			colorBuffer.element( idx ).assign( vec4( 1, 1, 1, 0 ) );
			lifeBuffer.element( idx ).assign( vec2( 999.0, 1.0 ) ); // age > lifetime → respawn
			sizeBuffer.element( idx ).assign( float( 0.0 ) );
			stretchBuffer.element( idx ).assign( float( 1.0 ) );
			rotationBuffer.element( idx ).assign( float( 0.0 ) );

		} )().compute( MAX_PARTICLES );

		// ===================== COMPUTE RESPAWN =====================
		this.computeRespawn = Fn( () => {

			const idx = instanceIndex;

			// Skip inactive particles
			If( idx.greaterThanEqual( int( u.activeParticleCount ) ), () => {

				colorBuffer.element( idx ).assign( vec4( 0, 0, 0, 0 ) );
				sizeBuffer.element( idx ).assign( float( 0.0 ) );
				stretchBuffer.element( idx ).assign( float( 1.0 ) );
				return;

			} );

			const life = lifeBuffer.element( idx ).toVar();
			const age = life.x;
			const maxLife = life.y;

			// Only respawn dead particles
			If( age.greaterThanEqual( maxLife ), () => {

				// New unique seed based on index, frame and time
				const newSeed = float( idx ).mul( 0.37 ).add( u.frameSeed ).add( time.mul( 17.31 ) );
				seedBuffer.element( idx ).assign( newSeed );

				const seed = newSeed;

				// Determine spawn position based on emitter type
				const spawnPos = vec3( 0, 0, 0 ).toVar();

				If( u.emitterType.equal( 0 ), () => {
					spawnPos.assign( pointEmitter( u.emitterOrigin, seed ) );
				} );
				If( u.emitterType.equal( 1 ), () => {
					spawnPos.assign( sphereEmitter( u.emitterOrigin, u.emitterRadius, seed ) );
				} );
				If( u.emitterType.equal( 2 ), () => {
					spawnPos.assign( boxEmitter( u.emitterOrigin, u.emitterHalfExtents, seed ) );
				} );
				If( u.emitterType.equal( 3 ), () => {
					spawnPos.assign( coneEmitter( u.emitterOrigin, u.emitterAngle, u.emitterHeight, seed ) );
				} );
				If( u.emitterType.equal( 4 ), () => {
					spawnPos.assign( ringEmitter( u.emitterOrigin, u.emitterMajorRadius, u.emitterMinorRadius, seed ) );
				} );
				If( u.emitterType.equal( 5 ), () => {
					spawnPos.assign( spiralEmitter( u.emitterOrigin, u.emitterRadius, u.emitterTurns, u.emitterHeight, seed ) );
				} );
				If( u.emitterType.equal( 6 ), () => {
					spawnPos.assign( diskEmitter( u.emitterOrigin, u.emitterRadius, seed ) );
				} );

				positionBuffer.element( idx ).assign( spawnPos );

				// Initial velocity
				const speedRange = u.initialSpeedMax.sub( u.initialSpeedMin );
				const speed = u.initialSpeedMin.add( hash( seed.add( 99.0 ) ).mul( speedRange ) );
				const vel = getEmitVelocity(
					u.emitterType, spawnPos, u.emitterOrigin,
					speed, u.initialSpread, seed
				);
				velocityBuffer.element( idx ).assign( vel );

				// Lifetime
				const lifeRange = u.lifetimeMax.sub( u.lifetimeMin );
				const newMaxLife = u.lifetimeMin.add( hash( seed.add( 77.0 ) ).mul( lifeRange ) );
				lifeBuffer.element( idx ).assign( vec2( 0.0, newMaxLife ) );

				// Initial visual state
				colorBuffer.element( idx ).assign( vec4( 1, 1, 1, 1 ) );
				sizeBuffer.element( idx ).assign( u.startSize );
				stretchBuffer.element( idx ).assign( float( 1.0 ) );
				rotationBuffer.element( idx ).assign( hash( seed.add( 55.0 ) ).mul( float( Math.PI * 2 ) ) );

			} );

		} )().compute( MAX_PARTICLES );

		// ===================== COMPUTE FORCES =====================
		this.computeForces = Fn( () => {

			const idx = instanceIndex;

			// Skip inactive
			If( idx.greaterThanEqual( int( u.activeParticleCount ) ), () => { return; } );

			const life = lifeBuffer.element( idx ).toVar();
			const age = life.x;
			const maxLife = life.y;

			// Skip dead particles
			If( age.greaterThanEqual( maxLife ), () => { return; } );

			const pos = positionBuffer.element( idx ).toVar();
			const vel = velocityBuffer.element( idx ).toVar();

			// Apply all forces
			const newVel = applyAllForces(
				vel, pos, deltaTime,
				u.gravityStrength, u.gravityDirection,
				u.windStrength, u.windDirection,
				u.turbulenceStrength, u.turbulenceScale, u.turbulenceSpeed,
				u.vortexStrength, u.vortexAxis,
				u.attractorEnabled, u.attractorPosition, u.attractorStrength,
				u.dragCoefficient,
				u.funnelStrength, u.funnelBaseRadius, u.funnelTopRadius, u.funnelHeight, u.emitterOrigin
			);

			// Euler integration
			const newPos = pos.add( newVel.mul( deltaTime ) );

			// Write back
			positionBuffer.element( idx ).assign( newPos );
			velocityBuffer.element( idx ).assign( newVel );

			// Advance age
			lifeBuffer.element( idx ).assign( vec2( age.add( deltaTime ), maxLife ) );

		} )().compute( MAX_PARTICLES );

		// ===================== COMPUTE VISUALS =====================
		this.computeVisuals = Fn( () => {

			const idx = instanceIndex;

			// Skip inactive
			If( idx.greaterThanEqual( int( u.activeParticleCount ) ), () => { return; } );

			const life = lifeBuffer.element( idx ).toVar();
			const age = life.x;
			const maxLife = life.y;

			// Skip dead particles - make invisible
			If( age.greaterThanEqual( maxLife ), () => {

				colorBuffer.element( idx ).assign( vec4( 0, 0, 0, 0 ) );
				sizeBuffer.element( idx ).assign( float( 0.0 ) );
				stretchBuffer.element( idx ).assign( float( 1.0 ) );
				return;

			} );

			// Normalized lifetime 0..1
			const t = clamp( age.div( maxLife ), 0.0, 1.0 );

			// --- Sample color gradient ---
			const gradColor = gradientColors.element( 0 ).toVar();

			// Iterate through gradient stops
			Loop( 7, ( { i } ) => {

				const currPos = gradientPositions.element( i );
				const nextPos = gradientPositions.element( int( i ).add( 1 ) );
				const currColor = gradientColors.element( i );
				const nextColor = gradientColors.element( int( i ).add( 1 ) );

				If( t.greaterThanEqual( currPos ).and( t.lessThan( nextPos ) ), () => {

					const localT = t.sub( currPos ).div( nextPos.sub( currPos ).max( 0.001 ) );
					gradColor.assign( mix( currColor, nextColor, localT ) );

				} );

			} );

			// Handle last segment
			If( t.greaterThanEqual( gradientPositions.element( int( gradientStopCount ).sub( 1 ) ) ), () => {
				gradColor.assign( gradientColors.element( int( gradientStopCount ).sub( 1 ) ) );
			} );

			// --- Sample size curve ---
			const sizeIdx = t.mul( 31.0 );
			const sizeLo = floor( sizeIdx ).toInt();
			const sizeHi = min( sizeLo.add( 1 ), int( 31 ) );
			const sizeFrac = fract( sizeIdx );
			const sizeValue = mix(
				sizeCurveData.element( sizeLo ),
				sizeCurveData.element( sizeHi ),
				sizeFrac
			);

			// --- Sample opacity curve ---
			const opIdx = t.mul( 31.0 );
			const opLo = floor( opIdx ).toInt();
			const opHi = min( opLo.add( 1 ), int( 31 ) );
			const opFrac = fract( opIdx );
			const opacityValue = mix(
				opacityCurveData.element( opLo ),
				opacityCurveData.element( opHi ),
				opFrac
			);

			const vel = velocityBuffer.element( idx ).toVar();
			const speed = vel.length();
			const speedStretch = speed.mul( u.velocityStretchFactor ).add( 1.0 );
			const clampedStretch = clamp( speedStretch, u.velocityStretchMin, u.velocityStretchMax );
			const stretchValue = mix( float( 1.0 ), clampedStretch, clamp( u.velocityStretch, 0.0, 1.0 ) );

			// --- Write visual properties ---
			colorBuffer.element( idx ).assign( vec4( gradColor, opacityValue ) );
			sizeBuffer.element( idx ).assign( u.startSize.mul( sizeValue ).max( 0.001 ) );
			stretchBuffer.element( idx ).assign( stretchValue );

			// Rotation
			If( u.alignToVelocity.greaterThan( 0.5 ), () => {

				const velocityAngle = atan2( vel.y, vel.x );
				rotationBuffer.element( idx ).assign( velocityAngle );

			} );

			If( u.alignToVelocity.lessThan( 0.5 ), () => {

				const rot = rotationBuffer.element( idx );
				rotationBuffer.element( idx ).assign( rot.add( u.rotationSpeed.mul( deltaTime ) ) );

			} );

		} )().compute( MAX_PARTICLES );

	}

	_createMesh() {

		// Create sprite material with GPU buffer attributes
		this.material = new THREE.SpriteNodeMaterial( {
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			sizeAttenuation: true,
		} );

		// Position from GPU buffer
		this.material.positionNode = this.positionBuffer.toAttribute();

		// Color from GPU buffer (rgb only)
		this.material.colorNode = this.colorBuffer.toAttribute().xyz;

		// Opacity with particle shape mask
		const shapeAlpha = getShapeByIndex( 0 )(); // default soft circle
		this.material.opacityNode = this.colorBuffer.toAttribute().w.mul( shapeAlpha );

		// Scale from GPU buffer
		const sizeNode = this.sizeBuffer.toAttribute();
		const stretchNode = this.stretchBuffer.toAttribute();
		this.material.scaleNode = vec2( sizeNode.mul( stretchNode ), sizeNode );

		// Rotation from GPU buffer
		this.material.rotationNode = this.rotationBuffer.toAttribute();

		// Create mesh
		this.mesh = new THREE.Mesh(
			new THREE.PlaneGeometry( 1, 1 ),
			this.material
		);
		this.mesh.count = MAX_PARTICLES;
		this.mesh.frustumCulled = false;
		this.mesh.matrixAutoUpdate = false;

		this.scene.add( this.mesh );

	}

	setBlending( mode ) {

		const modes = {
			'additive': THREE.AdditiveBlending,
			'normal': THREE.NormalBlending,
			'multiply': THREE.MultiplyBlending,
		};
		this.material.blending = modes[ mode ] || THREE.AdditiveBlending;
		this.material.needsUpdate = true;

	}

	setParticleShape( index ) {

		const shapeAlpha = getShapeByIndex( index )();
		this.material.opacityNode = this.colorBuffer.toAttribute().w.mul( shapeAlpha );
		this.material.needsUpdate = true;

	}

	setGradient( stops ) {

		// stops: [{pos: 0-1, color: '#hex'}]
		const sortedStops = [ ...stops ].sort( ( a, b ) => a.pos - b.pos );
		const colors = [];
		const positions = [];

		for ( let i = 0; i < 8; i ++ ) {

			if ( i < sortedStops.length ) {

				const c = new THREE.Color( sortedStops[ i ].color );
				colors.push( c );
				positions.push( sortedStops[ i ].pos );

			} else {

				colors.push( new THREE.Color( '#000000' ) );
				positions.push( 1.0 );

			}

		}

		// Update uniform arrays
		for ( let i = 0; i < 8; i ++ ) {

			this.gradientColors.array[ i ].copy( colors[ i ] );
			this.gradientPositions.array[ i ] = positions[ i ];

		}

		this.gradientColors.needsUpdate = true;
		this.gradientPositions.needsUpdate = true;
		this.gradientStopCount.value = sortedStops.length;

	}

	setSizeCurve( values ) {

		// values: Float32Array or Array of 32 floats
		for ( let i = 0; i < 32; i ++ ) {

			this.sizeCurveData.array[ i ] = values[ i ] !== undefined ? values[ i ] : 0;

		}

		this.sizeCurveData.needsUpdate = true;

	}

	setOpacityCurve( values ) {

		// values: Float32Array or Array of 32 floats
		for ( let i = 0; i < 32; i ++ ) {

			this.opacityCurveData.array[ i ] = values[ i ] !== undefined ? values[ i ] : 0;

		}

		this.opacityCurveData.needsUpdate = true;

	}

	updateFrameSeed() {

		this.uniforms.frameSeed.value = Math.random() * 1000;

	}

	getUniforms() {

		return this.uniforms;

	}

	dispose() {

		if ( this.mesh ) {

			this.scene.remove( this.mesh );
			this.mesh.geometry.dispose();
			this.material.dispose();

		}

	}

}

export { MAX_PARTICLES };
