import * as THREE from 'three/webgpu';
import { PRESETS, PRESET_META } from './PresetLibrary.js';

const WEBGPU_PARTICLE_LIMIT = 100000;
const WEBGL_PARTICLE_LIMIT = 35000;
const VALID_BACKENDS = new Set( [ 'webgpu', 'webgl' ] );

export class PresetManager {

	constructor( particleSystem, options = {} ) {

		this.particleSystem = particleSystem;
		this.uniforms = particleSystem.getUniforms();
		this.isTransitioning = false;
		this.defaultBackend = VALID_BACKENDS.has( options.backend ) ? options.backend : 'webgpu';

	}

	setDefaultBackend( backend ) {

		if ( VALID_BACKENDS.has( backend ) ) this.defaultBackend = backend;

	}

	_resolveBackend( options = {} ) {

		if ( VALID_BACKENDS.has( options.backend ) ) return options.backend;
		return this.defaultBackend;

	}

	_getMergedParams( presetName, backend ) {

		const preset = PRESETS[ presetName ];
		if ( ! preset ) return null;

		const baseParams = preset.params;
		const meta = PRESET_META[ presetName ] || {};

		if ( backend === 'webgl' && meta.webglOverrides ) {

			return { ...baseParams, ...meta.webglOverrides };

		}

		return baseParams;

	}

	applyPreset( presetName, duration = 0, options = {} ) {

		const backend = this._resolveBackend( options );
		const hasPreset = Boolean( PRESETS[ presetName ] );
		const resolvedPresetName = hasPreset ? presetName : 'fire';

		if ( ! hasPreset ) {

			console.warn( `Preset "${ presetName }" not found.` );

		}

		const p = this._getMergedParams( resolvedPresetName, backend );

		// Apply all uniform values immediately
		this._applyParams( p, backend );
		return resolvedPresetName;

	}

	_applyParams( p, backend ) {

		const u = this.uniforms;
		const backendParticleLimit = backend === 'webgl' ? WEBGL_PARTICLE_LIMIT : WEBGPU_PARTICLE_LIMIT;

		// Emitter
		u.emitterType.value = p.emitterShape;
		u.activeParticleCount.value = Math.min(
			p.particleCount,
			this.particleSystem.maxParticles,
			backendParticleLimit
		);
		u.emitterRadius.value = p.emitterRadius;
		u.emitterAngle.value = p.emitterAngle;
		u.emitterHeight.value = p.emitterHeight;

		if ( p.emitterHalfExtents ) {

			u.emitterHalfExtents.value.set(
				p.emitterHalfExtents.x,
				p.emitterHalfExtents.y,
				p.emitterHalfExtents.z
			);

		}

		u.emitterMajorRadius.value = p.emitterMajorRadius || 1.0;
		u.emitterMinorRadius.value = p.emitterMinorRadius || 0.2;
		u.emitterTurns.value = p.emitterTurns || 3.0;

		// Lifetime & speed
		u.lifetimeMin.value = p.lifetimeMin;
		u.lifetimeMax.value = p.lifetimeMax;
		u.initialSpeedMin.value = p.initialSpeedMin;
		u.initialSpeedMax.value = p.initialSpeedMax;
		u.initialSpread.value = p.initialSpread;
		u.startSize.value = p.startSize;
		u.rotationSpeed.value = p.rotationSpeed || 0;

		// Forces
		u.gravityStrength.value = p.gravityStrength;
		u.gravityDirection.value.set( 0, p.gravityDirectionY !== undefined ? p.gravityDirectionY : - 1, 0 );
		u.windStrength.value = p.windStrength;
		u.windDirection.value.set(
			p.windDirectionX || 0,
			0,
			p.windDirectionZ || 0
		).normalize();
		if ( u.windDirection.value.length() < 0.01 ) {

			u.windDirection.value.set( 1, 0, 0 );

		}

		u.turbulenceStrength.value = p.turbulenceStrength;
		u.turbulenceScale.value = p.turbulenceScale;
		u.turbulenceSpeed.value = p.turbulenceSpeed;
		u.vortexStrength.value = p.vortexStrength;
		u.funnelStrength.value = p.funnelStrength !== undefined ? p.funnelStrength : 0.0;
		u.funnelBaseRadius.value = p.funnelBaseRadius !== undefined ? p.funnelBaseRadius : 0.35;
		u.funnelTopRadius.value = p.funnelTopRadius !== undefined ? p.funnelTopRadius : 2.4;
		u.funnelHeight.value = p.funnelHeight !== undefined ? p.funnelHeight : 6.0;
		u.attractorEnabled.value = p.attractorEnabled ? 1.0 : 0.0;
		u.attractorStrength.value = p.attractorStrength || 0;

		if ( p.attractorX !== undefined ) {

			u.attractorPosition.value.set(
				p.attractorX,
				p.attractorY || 0,
				p.attractorZ || 0
			);

		}

		u.dragCoefficient.value = p.dragCoefficient;
		u.velocityStretch.value = p.velocityStretch !== undefined ? p.velocityStretch : 0.0;
		u.velocityStretchFactor.value = p.velocityStretchFactor !== undefined ? p.velocityStretchFactor : 0.35;
		u.velocityStretchMin.value = p.velocityStretchMin !== undefined ? p.velocityStretchMin : 1.0;
		u.velocityStretchMax.value = p.velocityStretchMax !== undefined ? p.velocityStretchMax : 8.0;
		u.alignToVelocity.value = p.alignToVelocity ? 1.0 : 0.0;

		// Visual
		if ( p.colorGradient ) {

			this.particleSystem.setGradient( p.colorGradient );

		}

		if ( p.sizeCurve ) {

			this.particleSystem.setSizeCurve( p.sizeCurve );

		}

		if ( p.opacityCurve ) {

			this.particleSystem.setOpacityCurve( p.opacityCurve );

		}

		if ( p.particleShape !== undefined ) {

			this.particleSystem.setParticleShape( p.particleShape );

		}

		if ( p.blending ) {

			this.particleSystem.setBlending( p.blending );

		}

		// Background color
		if ( p.backgroundColor ) {

			this.particleSystem.scene.background = new THREE.Color( p.backgroundColor );

		}

	}

}
