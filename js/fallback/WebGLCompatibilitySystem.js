import * as THREE from 'three/webgl';

const DEFAULT_MAX_PARTICLES = 100000;
const DEFAULT_ACTIVE_PARTICLES = 20000;
const SHAPE_TEXTURE_SIZE = 128;

function makeScalarUniform( value ) {

	return { value };

}

function clamp01( value ) {

	return Math.max( 0, Math.min( 1, value ) );

}

function drawStarPath( ctx, cx, cy, outerRadius, innerRadius, points = 5 ) {

	ctx.beginPath();
	for ( let i = 0; i < points * 2; i ++ ) {

		const radius = i % 2 === 0 ? outerRadius : innerRadius;
		const angle = ( i / ( points * 2 ) ) * Math.PI * 2 - Math.PI * 0.5;
		const x = cx + Math.cos( angle ) * radius;
		const y = cy + Math.sin( angle ) * radius;
		if ( i === 0 ) ctx.moveTo( x, y );
		else ctx.lineTo( x, y );

	}
	ctx.closePath();

}

function drawHeartPath( ctx, cx, cy, scale ) {

	ctx.beginPath();
	ctx.moveTo( cx, cy + scale * 0.85 );
	ctx.bezierCurveTo( cx - scale * 1.2, cy + scale * 0.2, cx - scale * 0.95, cy - scale * 0.85, cx, cy - scale * 0.25 );
	ctx.bezierCurveTo( cx + scale * 0.95, cy - scale * 0.85, cx + scale * 1.2, cy + scale * 0.2, cx, cy + scale * 0.85 );
	ctx.closePath();

}

function createShapeTexture( drawShape ) {

	const canvas = document.createElement( 'canvas' );
	canvas.width = SHAPE_TEXTURE_SIZE;
	canvas.height = SHAPE_TEXTURE_SIZE;

	const ctx = canvas.getContext( '2d' );
	if ( ! ctx ) return null;

	ctx.clearRect( 0, 0, SHAPE_TEXTURE_SIZE, SHAPE_TEXTURE_SIZE );
	ctx.fillStyle = '#ffffff';
	drawShape( ctx, SHAPE_TEXTURE_SIZE );

	const texture = new THREE.CanvasTexture( canvas );
	texture.minFilter = THREE.LinearMipMapLinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.needsUpdate = true;
	return texture;

}

function createFallbackTexture() {

	return createShapeTexture( ( ctx, size ) => {

		const c = size * 0.5;
		const r = size * 0.35;
		const gradient = ctx.createRadialGradient( c, c, 0, c, c, r );
		gradient.addColorStop( 0.0, 'rgba(255,255,255,1.0)' );
		gradient.addColorStop( 0.7, 'rgba(255,255,255,0.85)' );
		gradient.addColorStop( 1.0, 'rgba(255,255,255,0.0)' );
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc( c, c, r, 0, Math.PI * 2 );
		ctx.fill();

	} );

}

function buildShapeTextures() {

	const textures = new Array( 8 );

	textures[ 0 ] = createShapeTexture( ( ctx, size ) => {

		const c = size * 0.5;
		const r = size * 0.4;
		const gradient = ctx.createRadialGradient( c, c, 0, c, c, r );
		gradient.addColorStop( 0.0, 'rgba(255,255,255,1.0)' );
		gradient.addColorStop( 0.55, 'rgba(255,255,255,0.95)' );
		gradient.addColorStop( 1.0, 'rgba(255,255,255,0.0)' );
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc( c, c, r, 0, Math.PI * 2 );
		ctx.fill();

	} );

	textures[ 1 ] = createShapeTexture( ( ctx, size ) => {

		const c = size * 0.5;
		const r = size * 0.34;
		ctx.beginPath();
		ctx.arc( c, c, r, 0, Math.PI * 2 );
		ctx.fill();

	} );

	textures[ 2 ] = createShapeTexture( ( ctx, size ) => {

		const c = size * 0.5;
		drawStarPath( ctx, c, c, size * 0.38, size * 0.16, 5 );
		ctx.fill();

	} );

	textures[ 3 ] = createShapeTexture( ( ctx, size ) => {

		const c = size * 0.5;
		ctx.globalAlpha = 0.72;
		for ( let i = 0; i < 9; i ++ ) {

			const angle = ( i / 9 ) * Math.PI * 2;
			const offset = size * 0.11;
			const x = c + Math.cos( angle ) * offset * ( 0.4 + ( i % 3 ) * 0.35 );
			const y = c + Math.sin( angle ) * offset * ( 0.4 + ( ( i + 1 ) % 3 ) * 0.35 );
			const r = size * ( 0.13 + ( i % 4 ) * 0.018 );
			const g = ctx.createRadialGradient( x, y, 0, x, y, r );
			g.addColorStop( 0, 'rgba(255,255,255,0.95)' );
			g.addColorStop( 1, 'rgba(255,255,255,0.0)' );
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc( x, y, r, 0, Math.PI * 2 );
			ctx.fill();

		}
		ctx.globalAlpha = 1.0;

	} );

	textures[ 4 ] = createShapeTexture( ( ctx, size ) => {

		const c = size * 0.5;
		const w = size * 0.16;
		const h = size * 0.82;
		const gradient = ctx.createLinearGradient( c, c - h * 0.5, c, c + h * 0.5 );
		gradient.addColorStop( 0.0, 'rgba(255,255,255,0.0)' );
		gradient.addColorStop( 0.25, 'rgba(255,255,255,0.9)' );
		gradient.addColorStop( 0.75, 'rgba(255,255,255,0.9)' );
		gradient.addColorStop( 1.0, 'rgba(255,255,255,0.0)' );
		ctx.fillStyle = gradient;
		ctx.fillRect( c - w * 0.5, c - h * 0.5, w, h );

	} );

	textures[ 5 ] = createShapeTexture( ( ctx, size ) => {

		const c = size * 0.5;
		const r = size * 0.38;
		ctx.beginPath();
		ctx.moveTo( c, c - r );
		ctx.lineTo( c + r, c );
		ctx.lineTo( c, c + r );
		ctx.lineTo( c - r, c );
		ctx.closePath();
		ctx.fill();

	} );

	textures[ 6 ] = createShapeTexture( ( ctx, size ) => {

		const c = size * 0.5;
		const outer = size * 0.4;
		const inner = size * 0.2;
		ctx.beginPath();
		ctx.arc( c, c, outer, 0, Math.PI * 2 );
		ctx.fill();
		ctx.globalCompositeOperation = 'destination-out';
		ctx.beginPath();
		ctx.arc( c, c, inner, 0, Math.PI * 2 );
		ctx.fill();
		ctx.globalCompositeOperation = 'source-over';

	} );

	textures[ 7 ] = createShapeTexture( ( ctx, size ) => {

		const c = size * 0.5;
		drawHeartPath( ctx, c, c + size * 0.03, size * 0.22 );
		ctx.fill();

	} );

	for ( let i = 0; i < textures.length; i ++ ) {

		if ( ! textures[ i ] ) textures[ i ] = createFallbackTexture();

	}

	return textures;

}

export class WebGLCompatibilitySystem {

	constructor( scene, options = {} ) {

		this.scene = scene;
		this.maxParticles = options.maxParticles || DEFAULT_MAX_PARTICLES;
		this.activeCount = Math.min( options.particleCount || DEFAULT_ACTIVE_PARTICLES, this.maxParticles );
		this.time = 0;

		this.uniforms = this._createUniforms( this.activeCount );
		this.gradientStops = [];
		this.sizeCurve = new Array( 32 ).fill( 0 ).map( ( _, i ) => Math.sin( ( i / 31 ) * Math.PI ) );
		this.opacityCurve = new Array( 32 ).fill( 0 ).map( ( _, i ) => {

			const t = i / 31;
			return t < 0.1 ? t * 10 : Math.max( 0, 1 - ( t - 0.1 ) / 0.9 );

		} );
		this.runtimeParticleCap = null;

		this.positions = new Float32Array( this.maxParticles * 3 );
		this.colors = new Float32Array( this.maxParticles * 3 );
		this.velX = new Float32Array( this.maxParticles );
		this.velY = new Float32Array( this.maxParticles );
		this.velZ = new Float32Array( this.maxParticles );
		this.life = new Float32Array( this.maxParticles );
		this.maxLife = new Float32Array( this.maxParticles );
		this.shapeTextures = buildShapeTextures();

		this.geometry = new THREE.BufferGeometry();
		this.geometry.setAttribute( 'position', new THREE.BufferAttribute( this.positions, 3 ) );
		this.geometry.setAttribute( 'color', new THREE.BufferAttribute( this.colors, 3 ) );
		this.geometry.setDrawRange( 0, this.activeCount );

		this.material = new THREE.PointsMaterial( {
			size: 0.18,
			transparent: true,
			opacity: 0.95,
			depthWrite: false,
			vertexColors: true,
			blending: THREE.AdditiveBlending,
			sizeAttenuation: true
		} );
		this.material.alphaTest = 0.02;

		this.points = new THREE.Points( this.geometry, this.material );
		this.points.frustumCulled = false;
		this.scene.add( this.points );
		this.setParticleShape( this.uniforms.particleShapeType.value );

		this.setGradient( [
			{ pos: 0.0, color: '#ffffff' },
			{ pos: 0.3, color: '#ffaa33' },
			{ pos: 0.6, color: '#ff4400' },
			{ pos: 1.0, color: '#110000' }
		] );

		for ( let i = 0; i < this.maxParticles; i ++ ) {

			this._respawn( i, true );

		}

		this.geometry.attributes.position.needsUpdate = true;
		this.geometry.attributes.color.needsUpdate = true;

	}

	_createUniforms( activeCount ) {

		return {
			activeParticleCount: makeScalarUniform( activeCount ),
			emitterType: makeScalarUniform( 3 ),
			emitterOrigin: makeScalarUniform( new THREE.Vector3( 0, 0, 0 ) ),
			emitterRadius: makeScalarUniform( 0.4 ),
			emitterAngle: makeScalarUniform( 0.3 ),
			emitterHeight: makeScalarUniform( 0.15 ),
			emitterHalfExtents: makeScalarUniform( new THREE.Vector3( 1, 1, 1 ) ),
			emitterMajorRadius: makeScalarUniform( 1.0 ),
			emitterMinorRadius: makeScalarUniform( 0.2 ),
			emitterTurns: makeScalarUniform( 3.0 ),
			lifetimeMin: makeScalarUniform( 0.8 ),
			lifetimeMax: makeScalarUniform( 2.0 ),
			initialSpeedMin: makeScalarUniform( 1.5 ),
			initialSpeedMax: makeScalarUniform( 3.5 ),
			initialSpread: makeScalarUniform( 0.3 ),
			startSize: makeScalarUniform( 0.08 ),
			rotationSpeed: makeScalarUniform( 0.0 ),
			gravityStrength: makeScalarUniform( - 2.0 ),
			gravityDirection: makeScalarUniform( new THREE.Vector3( 0, - 1, 0 ) ),
			windStrength: makeScalarUniform( 0.3 ),
			windDirection: makeScalarUniform( new THREE.Vector3( 1, 0, 0 ) ),
			turbulenceStrength: makeScalarUniform( 2.5 ),
			turbulenceScale: makeScalarUniform( 1.2 ),
			turbulenceSpeed: makeScalarUniform( 2.0 ),
			vortexStrength: makeScalarUniform( 1.0 ),
			vortexAxis: makeScalarUniform( new THREE.Vector3( 0, 1, 0 ) ),
			funnelStrength: makeScalarUniform( 0.0 ),
			funnelBaseRadius: makeScalarUniform( 0.35 ),
			funnelTopRadius: makeScalarUniform( 2.4 ),
			funnelHeight: makeScalarUniform( 6.0 ),
			attractorEnabled: makeScalarUniform( 0.0 ),
			attractorPosition: makeScalarUniform( new THREE.Vector3( 0, 2, 0 ) ),
			attractorStrength: makeScalarUniform( 0.0 ),
			dragCoefficient: makeScalarUniform( 0.3 ),
			particleShapeType: makeScalarUniform( 0 ),
			velocityStretch: makeScalarUniform( 0.0 ),
			velocityStretchFactor: makeScalarUniform( 0.35 ),
			velocityStretchMin: makeScalarUniform( 1.0 ),
			velocityStretchMax: makeScalarUniform( 8.0 ),
			alignToVelocity: makeScalarUniform( 0.0 ),
			frameSeed: makeScalarUniform( 0.0 )
		};

	}

	_safeNormalize( vector, fallback ) {

		if ( vector.lengthSq() < 1e-6 ) return fallback.clone();
		return vector.clone().normalize();

	}

	_randomRange( minValue, maxValue ) {

		if ( maxValue <= minValue ) return minValue;
		return minValue + Math.random() * ( maxValue - minValue );

	}

	_getSpawnPosition() {

		const u = this.uniforms;
		const origin = u.emitterOrigin.value;
		const type = Math.floor( u.emitterType.value );
		const theta = Math.random() * Math.PI * 2;
		const v = new THREE.Vector3();

		switch ( type ) {

			case 1: { // sphere
				const phi = Math.acos( 1 - 2 * Math.random() );
				const r = Math.cbrt( Math.random() ) * u.emitterRadius.value;
				v.set(
					Math.sin( phi ) * Math.cos( theta ),
					Math.cos( phi ),
					Math.sin( phi ) * Math.sin( theta )
				).multiplyScalar( r );
				break;
			}
			case 2: { // box
				const ext = u.emitterHalfExtents.value;
				v.set(
					( Math.random() * 2 - 1 ) * ext.x,
					( Math.random() * 2 - 1 ) * ext.y,
					( Math.random() * 2 - 1 ) * ext.z
				);
				break;
			}
			case 3: { // cone
				const h = Math.random() * u.emitterHeight.value;
				const radius = Math.sqrt( Math.random() ) * h * u.emitterAngle.value;
				v.set( Math.cos( theta ) * radius, h, Math.sin( theta ) * radius );
				break;
			}
			case 4: { // ring
				const phi = Math.random() * Math.PI * 2;
				const major = u.emitterMajorRadius.value;
				const minor = u.emitterMinorRadius.value;
				const tube = major + Math.cos( phi ) * minor;
				v.set( Math.cos( theta ) * tube, Math.sin( phi ) * minor, Math.sin( theta ) * tube );
				break;
			}
			case 5: { // spiral
				const t = Math.random();
				const angle = t * u.emitterTurns.value * Math.PI * 2;
				const radius = t * u.emitterRadius.value;
				v.set(
					Math.cos( angle ) * radius,
					( t - 0.5 ) * u.emitterHeight.value,
					Math.sin( angle ) * radius
				);
				break;
			}
			case 6: { // disk
				const radius = Math.sqrt( Math.random() ) * u.emitterRadius.value;
				v.set( Math.cos( theta ) * radius, 0, Math.sin( theta ) * radius );
				break;
			}
			case 0:
			default:
				v.set( 0, 0, 0 );
				break;

		}

		return v.add( origin );

	}

	_getInitialVelocity( spawnPos ) {

		const u = this.uniforms;
		const emitterType = Math.floor( u.emitterType.value );
		const spread = u.initialSpread.value;
		const speed = this._randomRange( u.initialSpeedMin.value, u.initialSpeedMax.value );
		const dir = new THREE.Vector3( 0, 1, 0 );

		if ( emitterType === 1 ) {

			dir.copy( spawnPos ).sub( u.emitterOrigin.value ).normalize();

		} else if ( emitterType === 4 ) {

			dir.copy( spawnPos ).sub( u.emitterOrigin.value );
			dir.y = 0.4;
			dir.normalize();

		}

		dir.x += ( Math.random() - 0.5 ) * spread;
		dir.y += ( Math.random() - 0.5 ) * spread;
		dir.z += ( Math.random() - 0.5 ) * spread;
		dir.normalize();

		return dir.multiplyScalar( speed );

	}

	_sampleCurve( curve, t ) {

		const clamped = clamp01( t );
		const scaled = clamped * ( curve.length - 1 );
		const lo = Math.floor( scaled );
		const hi = Math.min( curve.length - 1, lo + 1 );
		const frac = scaled - lo;
		return curve[ lo ] * ( 1 - frac ) + curve[ hi ] * frac;

	}

	_sampleGradient( t ) {

		const clamped = clamp01( t );
		const stops = this.gradientStops;

		if ( stops.length === 0 ) return new THREE.Color( 1, 1, 1 );
		if ( clamped <= stops[ 0 ].pos ) return stops[ 0 ].color.clone();
		if ( clamped >= stops[ stops.length - 1 ].pos ) return stops[ stops.length - 1 ].color.clone();

		for ( let i = 0; i < stops.length - 1; i ++ ) {

			const a = stops[ i ];
			const b = stops[ i + 1 ];
			if ( clamped >= a.pos && clamped <= b.pos ) {

				const localT = ( clamped - a.pos ) / Math.max( 1e-5, b.pos - a.pos );
				return a.color.clone().lerp( b.color, localT );

			}

		}

		return stops[ 0 ].color.clone();

	}

	_respawn( index, randomAge = false ) {

		const i3 = index * 3;
		const spawn = this._getSpawnPosition();
		const vel = this._getInitialVelocity( spawn );
		const lifeMax = this._randomRange( this.uniforms.lifetimeMin.value, this.uniforms.lifetimeMax.value );

		this.positions[ i3 + 0 ] = spawn.x;
		this.positions[ i3 + 1 ] = spawn.y;
		this.positions[ i3 + 2 ] = spawn.z;

		this.velX[ index ] = vel.x;
		this.velY[ index ] = vel.y;
		this.velZ[ index ] = vel.z;

		this.maxLife[ index ] = lifeMax;
		this.life[ index ] = randomAge ? Math.random() * lifeMax : lifeMax;

		const c = this._sampleGradient( 0 );
		this.colors[ i3 + 0 ] = c.r;
		this.colors[ i3 + 1 ] = c.g;
		this.colors[ i3 + 2 ] = c.b;

	}

	_applyForces( index, delta ) {

		const i3 = index * 3;
		const u = this.uniforms;

		let vx = this.velX[ index ];
		let vy = this.velY[ index ];
		let vz = this.velZ[ index ];

		const px = this.positions[ i3 + 0 ];
		const py = this.positions[ i3 + 1 ];
		const pz = this.positions[ i3 + 2 ];

		const gravityDir = this._safeNormalize( u.gravityDirection.value, new THREE.Vector3( 0, - 1, 0 ) );
		const windDir = this._safeNormalize( u.windDirection.value, new THREE.Vector3( 1, 0, 0 ) );

		vx += gravityDir.x * u.gravityStrength.value * delta;
		vy += gravityDir.y * u.gravityStrength.value * delta;
		vz += gravityDir.z * u.gravityStrength.value * delta;

		vx += windDir.x * u.windStrength.value * delta;
		vy += windDir.y * u.windStrength.value * delta;
		vz += windDir.z * u.windStrength.value * delta;

		const noiseT = this.time * u.turbulenceSpeed.value;
		const scale = Math.max( 0.001, u.turbulenceScale.value );
		vx += Math.sin( px * scale + noiseT + index * 0.011 ) * u.turbulenceStrength.value * delta * 0.4;
		vy += Math.cos( py * scale * 0.8 + noiseT * 0.7 + index * 0.017 ) * u.turbulenceStrength.value * delta * 0.25;
		vz += Math.sin( pz * scale * 1.2 - noiseT + index * 0.023 ) * u.turbulenceStrength.value * delta * 0.4;

		const dx = px - u.emitterOrigin.value.x;
		const dz = pz - u.emitterOrigin.value.z;
		const dist = Math.max( 0.15, Math.hypot( dx, dz ) );
		vx += ( - dz / dist ) * ( u.vortexStrength.value / ( dist + 0.2 ) ) * delta;
		vz += ( dx / dist ) * ( u.vortexStrength.value / ( dist + 0.2 ) ) * delta;

		if ( u.funnelStrength.value > 0.001 ) {

			const funnelHeight = Math.max( 0.1, u.funnelHeight.value );
			const localY = py - u.emitterOrigin.value.y + funnelHeight * 0.5;
			const heightT = Math.max( 0, Math.min( 1, localY / funnelHeight ) );
			const targetRadius = u.funnelBaseRadius.value + ( u.funnelTopRadius.value - u.funnelBaseRadius.value ) * heightT;
			const radiusError = targetRadius - dist;
			const radialScale = ( radiusError * u.funnelStrength.value * delta ) / dist;
			vx += dx * radialScale;
			vz += dz * radialScale;

		}

		if ( u.attractorEnabled.value > 0.5 ) {

			const ax = u.attractorPosition.value.x - px;
			const ay = u.attractorPosition.value.y - py;
			const az = u.attractorPosition.value.z - pz;
			const attractDist = Math.max( 0.2, Math.hypot( ax, ay, az ) );
			const inv = 1 / attractDist;
			const force = ( u.attractorStrength.value / ( attractDist * attractDist + 0.5 ) ) * delta;
			vx += ax * inv * force;
			vy += ay * inv * force;
			vz += az * inv * force;

		}

		const drag = Math.max( 0, 1 - u.dragCoefficient.value * delta );
		vx *= drag;
		vy *= drag;
		vz *= drag;

		this.velX[ index ] = vx;
		this.velY[ index ] = vy;
		this.velZ[ index ] = vz;

		this.positions[ i3 + 0 ] = px + vx * delta;
		this.positions[ i3 + 1 ] = py + vy * delta;
		this.positions[ i3 + 2 ] = pz + vz * delta;

	}

	update( delta ) {

		this.time += delta;
		this.uniforms.frameSeed.value = Math.random() * 1000;
		const requestedCount = Math.floor( this.uniforms.activeParticleCount.value );
		const cappedCount = this.runtimeParticleCap === null
			? requestedCount
			: Math.min( requestedCount, this.runtimeParticleCap );
		this.activeCount = Math.max( 0, Math.min( this.maxParticles, cappedCount ) );
		if ( this.runtimeParticleCap === null ) this.uniforms.activeParticleCount.value = this.activeCount;
		this.geometry.setDrawRange( 0, this.activeCount );
		const stretchBoost = 1 + Math.max( 0, this.uniforms.velocityStretch.value ) * 0.6;
		this.material.size = Math.max( 0.01, this.uniforms.startSize.value * 2.6 * stretchBoost );

		for ( let i = 0; i < this.activeCount; i ++ ) {

			this.life[ i ] -= delta;
			if ( this.life[ i ] <= 0 ) {

				this._respawn( i, false );
				continue;

			}

			this._applyForces( i, delta );

			const i3 = i * 3;
			const t = 1 - this.life[ i ] / Math.max( 1e-5, this.maxLife[ i ] );
			const gradientColor = this._sampleGradient( t );
			const opacity = clamp01( this._sampleCurve( this.opacityCurve, t ) );
			const intensity = opacity * ( 0.35 + this._sampleCurve( this.sizeCurve, t ) * 0.65 );

			this.colors[ i3 + 0 ] = gradientColor.r * intensity;
			this.colors[ i3 + 1 ] = gradientColor.g * intensity;
			this.colors[ i3 + 2 ] = gradientColor.b * intensity;

		}

		this.geometry.attributes.position.needsUpdate = true;
		this.geometry.attributes.color.needsUpdate = true;

	}

	get particleCount() {

		return this.activeCount;

	}

	setGradient( stops ) {

		const sorted = [ ...stops ].sort( ( a, b ) => a.pos - b.pos );
		this.gradientStops = sorted.map( ( stop ) => ( {
			pos: clamp01( stop.pos ),
			color: new THREE.Color( stop.color )
		} ) );

	}

	setSizeCurve( values ) {

		this.sizeCurve = new Array( 32 ).fill( 0 ).map( ( _, i ) => clamp01( values[ i ] ?? 0 ) );

	}

	setOpacityCurve( values ) {

		this.opacityCurve = new Array( 32 ).fill( 0 ).map( ( _, i ) => clamp01( values[ i ] ?? 0 ) );

	}

	setParticleShape( index ) {

		const safeIndex = Number.isFinite( index ) ? Math.max( 0, Math.min( 7, Math.floor( index ) ) ) : 0;
		this.uniforms.particleShapeType.value = safeIndex;

		const texture = this.shapeTextures?.[ safeIndex ] || this.shapeTextures?.[ 0 ] || null;
		this.material.map = texture;
		this.material.alphaMap = texture;
		this.material.needsUpdate = true;

	}

	setBlending( mode ) {

		const modes = {
			'additive': THREE.AdditiveBlending,
			'normal': THREE.NormalBlending,
			'multiply': THREE.MultiplyBlending
		};

		this.material.blending = modes[ mode ] || THREE.AdditiveBlending;
		this.material.needsUpdate = true;

	}

	updateFrameSeed() {

		this.uniforms.frameSeed.value = Math.random() * 1000;

	}

	getUniforms() {

		return this.uniforms;

	}

	setRuntimeParticleCap( cap ) {

		if ( Number.isFinite( cap ) ) {

			this.runtimeParticleCap = Math.max( 0, Math.min( this.maxParticles, Math.floor( cap ) ) );

		} else {

			this.runtimeParticleCap = null;

		}

		const requestedCount = Math.floor( this.uniforms.activeParticleCount.value );
		const cappedCount = this.runtimeParticleCap === null
			? requestedCount
			: Math.min( requestedCount, this.runtimeParticleCap );
		this.activeCount = Math.max( 0, Math.min( this.maxParticles, cappedCount ) );
		this.geometry.setDrawRange( 0, this.activeCount );

	}

	dispose() {

		if ( this.points ) this.scene.remove( this.points );
		if ( this.geometry ) this.geometry.dispose();
		if ( this.material ) this.material.dispose();
		if ( this.shapeTextures ) {

			for ( let i = 0; i < this.shapeTextures.length; i ++ ) {

				if ( this.shapeTextures[ i ] && typeof this.shapeTextures[ i ].dispose === 'function' ) {

					this.shapeTextures[ i ].dispose();

				}

			}
			this.shapeTextures = null;

		}

	}

}
